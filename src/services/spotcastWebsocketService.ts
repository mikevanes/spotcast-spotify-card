import { RetrieveState, UseHomeAssistantStore } from "../store";
import { CategoriesResponse } from "../models/spotcast/category";
import { ChromecastResponse, DevicesResponse } from "../models/spotcast/device";
import { PlayerResponse } from "../models/spotcast/player";
import { PlaylistsResponse } from "../models/spotcast/playlist";
import { SearchResponse } from "../models/spotcast/search";
import { ViewResponse } from "../models/spotcast/view";
import { HomeAssistant } from "custom-card-helpers";
import { AccountResponse } from "models/spotcast/account";

/**
 * Service to handle WebSocket requests for Spotcast integration.
 */
export class SpotcastWebsocketService {

  _hass: HomeAssistant;

  constructor(hass: HomeAssistant) {
    this._hass = hass;
  }

  /**
   * General method to handle WebSocket requests.
   * @param type The type of WebSocket request.
   * @param payload Additional payload for the request.
   * @returns A promise resolving to the WebSocket response.
   */
  private async _callWebSocket<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    const message = {
      type,
      ...payload,
    };

    try {
      return await this._hass.callWS<T>(message);
    } catch (error: any) {
      throw new Error(`Failed to fetch ${type} (payload: ${JSON.stringify(message)}): ${JSON.stringify(error)}`);
    }
  }

  /**
   * Fetches the list of devices from Spotcast.
   * @param account Optional account identifier.
   * @returns A promise resolving to an array of devices.
   */
  async fetchDevices(account?: string): Promise<DevicesResponse> {
    const devices = await this._callWebSocket<DevicesResponse>('spotcast/devices', { account });

    return devices;
  }

  /**
   * Fetches the current player from Spotcast.
   * @param account Optional account identifier.
   * @returns A promise resolving to the current player.
   */
  async fetchPlayer(account?: string): Promise<PlayerResponse> {
    const currentPlayer = await this._callWebSocket<PlayerResponse>('spotcast/player', { account });

    return currentPlayer;
  }

  /**
   * Fetches the list of available Chromecast devices.
   * @returns A promise resolving to an array of Chromecast devices.
   */
  async fetchChromecasts(): Promise<ChromecastResponse> {
    const chromecasts = await this._callWebSocket<ChromecastResponse>('spotcast/castdevices');

    return chromecasts;
  }

  /**
   * Fetches categories from Spotcast.
   * @param account Optional account identifier.
   * @returns A promise resolving to the categories.
   */
  async fetchCategories(account?: string): Promise<CategoriesResponse> {
    const categories = await this._callWebSocket<CategoriesResponse>('spotcast/categories', { account });

    return categories;
  }

  /**
   * Fetches playlists from a specific category in Spotcast.
   * @param account Optional account identifier.
   * @param category The category to fetch playlists from.
   * @returns A promise resolving to the playlists.
   */
  async fetchPlaylists(account?: string, category?: string): Promise<PlaylistsResponse> {
    const playlists = await this._callWebSocket<PlaylistsResponse>('spotcast/playlists', { account, category });

    return playlists;
  }

  /**
   * Fetches a specific view from Spotcast.
   * @param account Optional account identifier.
   * @param url The URL of the view to fetch.
   * @returns A promise resolving to the view data.
   */
  async fetchView(account?: string, url: string = 'recently-played'): Promise<ViewResponse> {
    const view = await this._callWebSocket<ViewResponse>('spotcast/view', {
      account,
      url,
      limit: 20
    });

    UseHomeAssistantStore.setState({view});
    return view;
  }

  /**
   * Searches Spotcast for a specific query.
   * @param account Optional account identifier.
   * @param query The search query string.
   * @param searchType The type of search (e.g., 'track', 'album', 'playlist').
   * @returns A promise resolving to the search results.
   */
  async fetchSearch(account?: string, query: string = '', searchType: string = 'playlist'): Promise<SearchResponse> {
    const searchResults = await this._callWebSocket<SearchResponse>('spotcast/search', { account, query, searchType });

    return searchResults;
  }

  /**
   * Searches Spotcast for a specific query.
   * @param account Optional account identifier.
   * @param url The url of the playlist
   * @returns A promise resolving to the search results.
   */
  async fetchTracks(account?: string, playlistId: string = ''): Promise<any> {
    const tracks = await this._callWebSocket<any>('spotcast/tracks', { account, playlistId });
    
    return tracks;
  }

  /**
   * Gets the users liked media
   * @param account Optional account identifier.
   * @returns A promise resolving to the search results.
   */
  async fetchLikedMedia(account?: string): Promise<any> {
    const likedMedia = await this._callWebSocket<any>('spotcast/liked_media', { account });
    
    return likedMedia;
  }

  /**
   * Gets the available accounts
   * @returns A promise resolving the accounts.
   */
  async fetchAccounts(): Promise<AccountResponse> {
    const accounts = await this._callWebSocket<any>('spotcast/accounts');
    UseHomeAssistantStore.setState({accounts: accounts.accounts});
    
    return accounts;
  }
}
