import { html } from "lit";
import { state } from 'lit/decorators.js';

import { BaseView } from "./baseView";
import { PlaylistItem } from "../models/spotcast/PlaylistItem";
import { UseHomeAssistantStore } from "../store";
import { areObjectsEqual, getBackgroundGradient, removeHtmlTags, truncateText } from "../helpers/helpers";

export class CurrentlyPlayingView extends BaseView {
  @state() private gradient: string = "linear-gradient(45deg, #1f2937, #374151)";
  activeMedia: PlaylistItem = null;

  constructor() {
    super();
    UseHomeAssistantStore.subscribe(async (state, prevState) => {
      if(state.activeMedia?.item !== null && areObjectsEqual(state.activeMedia, prevState.activeMedia ) ) return;

      this.activeMedia = state.activeMedia.item;
      this.gradient = await getBackgroundGradient(this.activeMedia.icon);
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  renderTemplate() {
    return html`
      <div class="card max-h-[60px] p-3 rounded-lg" style="background: ${this.gradient}">
        <div class="flex items-center justify-between gap-3">
          <!-- Avatar and Text Section -->
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="mask mask-squircle h-12 w-12">
                <img src="${this.activeMedia?.icon}" alt="Avatar" />
              </div>
            </div>
            <div>
              <div class="font-bold text-white">${truncateText(removeHtmlTags(this.activeMedia?.name), 40)}</div>
              <div class="text-sm text-gray-400">${truncateText(removeHtmlTags(this.activeMedia?.description), 40)}</div>
            </div>
          </div>

          <!-- Icons Section -->
            <div class="flex items-center gap-2">
                <button class="btn btn-xs btn-ghost text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-speaker" viewBox="0 0 16 16">
                        <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                        <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-3.5 1.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                    </svg>
                </button>
                <button class="btn btn-xs btn-ghost text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-play-circle" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                        <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/>
                    </svg>
                </button>
            </div>
        </div>
      </div>
    `;
  }
}

customElements.define("currently-playing-view", CurrentlyPlayingView);
