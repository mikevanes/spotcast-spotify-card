import { SpotcastService } from "../services/spotcastService";
import { StoreState, UseHomeAssistantStore, UseViewStore, ViewMode } from "../store";
import { SpotcastWebsocketService } from "../services/spotcastWebsocketService";
import { HomeAssistant } from "custom-card-helpers";
import { PlayerResponse } from "../models/spotcast/player";
import { ViewResponse } from "../models/spotcast/view";
import { Account } from "../models/spotcast/account";
import { areObjectsEqual, delay, filterHassObject, isMediaLiked } from "../helpers/helpers";
import { TableData } from "../models/tableData";
import { TrackResponse } from "../models/spotcast/track";
import { html } from "lit";
import { DevicesResponse } from "models/spotcast/device";

export class SpotcastHandler {
    private _spotcastService: SpotcastService;
    private _spotcastWebsocketService: SpotcastWebsocketService;

    private _activeAccount: Account;
    private _activePlaylist: string;

    constructor() {

        UseHomeAssistantStore.subscribe(async (state, prevState) => {
            if (state.storeState === StoreState.FINISHED || !state.hass || !state.config) return;

            //Register services if needed, and fetch initial data if needed.
            await this.startup(state.hass);

            if(state.storeState === StoreState.PLAYMEDIA) {
                this.changeActiveMedia(state.changeData, prevState.changeData);
            }

            if (state.storeState == StoreState.LIKEMEDIA) {
                this.LikeMedia(state.changeData);
            }

            if (state.storeState === StoreState.UPDATEHASS && this.spotifyStateChanged(state.hass, prevState.hass)) {
                this.updateMedia();
            }

            if (state.storeState === StoreState.OPENPLAYLIST) {
                this.openPlaylist(state.changeData);
            }
        })
    }

    private async startup(hass: HomeAssistant) {
        if (this._spotcastService && this._spotcastWebsocketService) return;

        this._spotcastService = new SpotcastService(hass);
        this._spotcastWebsocketService = new SpotcastWebsocketService(hass);

        const accounts = await this._spotcastWebsocketService.fetchAccounts();
        this._activeAccount = accounts?.accounts?.filter(x => x.is_default)[0];

        const devices = await this._spotcastWebsocketService.fetchDevices();
        const chromecasts = await this._spotcastWebsocketService.fetchChromecasts()

        const likedMedia = await this._spotcastWebsocketService.fetchLikedMedia(this._activeAccount.entry_id);

        const player = await this._spotcastWebsocketService.fetchPlayer(this._activeAccount.entry_id);

        const view = await this._spotcastWebsocketService.fetchView();
        const filteredView: ViewResponse = {
            ...view,
            playlists: view.playlists?.filter(
                (p) => p.uri.includes("playlist") || p.uri.includes("collection")
            ) || [],
        };

        UseHomeAssistantStore.setState(prev => ({
            ...prev,
            accounts,
            activeTrack: { track: player.state.item, isPlaying: player.state.is_playing },
            activeDevice: player.state.device,
            devices,
            chromecasts,
            tableData: this.createTableData(filteredView, player),
            likedMedia: likedMedia,
            storeState: StoreState.FINISHED
        }));
    }

    private spotifyStateChanged(state: HomeAssistant, prevState: HomeAssistant) {
        const stateMediaPlayers = filterHassObject(state, 'media_player.spotify', this._activeAccount?.spotify_id);
        const prevStateMediaPlayers = filterHassObject(prevState, 'media_player.spotify', this._activeAccount?.spotify_id);

        return !areObjectsEqual(stateMediaPlayers, prevStateMediaPlayers);
    }

    private async openPlaylist(data: string) {
        UseViewStore.setState({ ViewMode: ViewMode.TRACK });

        const player = await this._spotcastWebsocketService.fetchPlayer(this._activeAccount.entry_id);
        const trackResponse = await this._spotcastWebsocketService.fetchTracks(this._activeAccount.entry_id, data);

        const tableData = this.createTableData(trackResponse, player);

        UseHomeAssistantStore.setState(prev => ({
            ...prev,
            tableData,
            storeState: StoreState.FINISHED
        }));

        this._activePlaylist = data;
    }

    private async changeActiveMedia(changeData: string, prevChangeData: string) {
        if (changeData === null || changeData ==  prevChangeData) {
            return;
        }

        this._spotcastService.playMedia(changeData, this._activeAccount.entry_id);

        delay(1, () => this.updateMedia());
    }

    private async LikeMedia(changeData: string) {
        if (isMediaLiked(changeData)) return;

        this._spotcastService.likeMedia([changeData]);

        UseHomeAssistantStore.setState(prev => ({
            ...prev,
            likedMedia: {
                ...prev.likedMedia,
                total: (prev.likedMedia?.total ?? 0) + 1,
                tracks: [...(prev.likedMedia?.tracks ?? []), changeData],
            },
            storeState: StoreState.FINISHED,
        }));
    }

    private async updateMedia() {
        const player = await this._spotcastWebsocketService.fetchPlayer(this._activeAccount.entry_id);
        const tableData = UseViewStore.getState().ViewMode === ViewMode.VIEW
        ? await (async () => {
            const view = await this._spotcastWebsocketService.fetchView();
            return {
                ...view,
                playlists: view.playlists?.filter(
                    (p) => p.uri.includes("playlist") || p.uri.includes("collection")
                ) || [],
            } as ViewResponse;
        })()
        : await this._spotcastWebsocketService.fetchTracks(
            this._activeAccount.entry_id,
            this._activePlaylist
        );

        UseHomeAssistantStore.setState(prev => ({
            ...prev,
            activeTrack: { track: player.state.item, isPlaying: player.state.is_playing },
            tableData: this.createTableData(tableData, player),
            storeState: StoreState.FINISHED,
        }));
    }

    private createTableData(source: ViewResponse | TrackResponse, player: PlayerResponse): TableData[] {
        const { state } = player;
        const activePlaylistUri = state?.context?.uri;
        const activeTrackUri = state?.item?.uri;

        const mapItemToTableData = (item: any, isTrack: boolean): TableData => ({
            id: item.id,
            name: item.name,
            img: isTrack ? item.album?.images?.[0]?.url : item.icon,
            description: isTrack
                ? item.artists?.map((artist: { name: string }) => artist.name).join(', ')
                : item.description,
            uri: item.uri,
            icons: isTrack
                ? [html`<like-icon .data="${item}" .liked="${isMediaLiked(item.uri)}"></like-icon>`]
                : [html`<play-pause-icon .data="${item}" .playing="${item.uri == activePlaylistUri}" ></play-pause-icon>`],
            isActive: isTrack
                ? item.uri == activeTrackUri
                : item.uri == activePlaylistUri,
            rowAction: isTrack ? StoreState.PLAYMEDIA : StoreState.OPENPLAYLIST,
        });

        if ('tracks' in source && Array.isArray(source.tracks)) {
            return source.tracks.map(track => mapItemToTableData(track, true));
        } else if ('playlists' in source && Array.isArray(source.playlists)) {
            return source.playlists.map(playlist => mapItemToTableData(playlist, false));
        }

        throw new Error('Invalid source data');
    }
}