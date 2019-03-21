import { CONFIG } from '../../../config';
import { ProfilePopup } from './ProfilePopup';

console.log('config is ', CONFIG);

const PROFILE_SCORE_EXTENSION_CLASS_NAME = 'HiveExtension-Twitter_profile-score';
const PROFILE_SIDEBAR_SELECTOR = '.ProfileSidebar';
const PROFILE_NAV_SELECTOR = '.ProfileNav';
const PROCESSED_INDICATOR_CLASS = 'HiveExtension-Twitter_profile-score-processed';

export class TwitterProfileScoreExtension {
  _api;
  _settings;

  constructor(api, settings) {
    this._api = api;
    this._settings = settings;
  }

  getUserId() {
    const profileNav = document.querySelector(PROFILE_NAV_SELECTOR);

    if (profileNav) {
      return profileNav.getAttribute('data-user-id');
    }
  }

  async start() {
    if (!this.isOnProfileScreen() || this.hasAlreadyRun()) {
      return;
    }

    const profileNav = document.querySelector('.ProfileNav-list');

    if (!profileNav || profileNav.classList.contains(PROCESSED_INDICATOR_CLASS)) {
      return;
    }

    profileNav.classList.add(PROCESSED_INDICATOR_CLASS);

    const userTwitterId = this.getUserId();

    const {
      score: defaultClusterScore,
      name: defaultClusterName,
      rank: defaultClusterRank,
      indexed: accountIndexed
    } = await this._api.getTwitterUserScore(userTwitterId);

    this.displayUserScore(
      defaultClusterScore,
      defaultClusterRank,
      defaultClusterName,
      accountIndexed
    );
  }

  async displayUserScore(
    defaultClusterScore,
    defaultClusterRank,
    defaultClusterName,
    accountIndexed
  ) {
    let tooltip = CONFIG.NO_SCORE_TOOLTIP;
    let label = '';
    let value = CONFIG.NO_SCORE_TEXT;

    const option = await this._settings.getOptionValue('displaySetting');

    if (
      accountIndexed &&
      ['showRanksWithScoreFallback', 'showRanks'].includes(option) &&
      defaultClusterRank
    ) {
      value = `${defaultClusterRank}`;
      label = `${defaultClusterName} Rank`;
      tooltip = `${defaultClusterName} Rank ${defaultClusterRank}`;
    } else if (option !== 'showRanks') {
      label = `${defaultClusterName} Score`;

      if (accountIndexed) {
        value = Math.round(defaultClusterScore);
        tooltip = `${defaultClusterName} Score ${value}`;
      }
    }

    const displayElement = document.createElement('div');
    displayElement.classList.add('ProfileNav-item');
    displayElement.classList.add(PROFILE_SCORE_EXTENSION_CLASS_NAME);

    displayElement.innerHTML = `
            <div class="ProfileNav-stat ProfileNav-stat--link u-borderUserColor u-textCenter js-tooltip js-nav u-textUserColor" href="#" data-original-title="${tooltip}">
                  <span class="ProfileNav-label">${label}</span>
                  <span class="ProfileNav-value" data-count="${value}" data-is-compact="false">${value}</span>
            </div>
        `;

    if (label) {
      if (accountIndexed) {
        const popup = new ProfilePopup(this.getUserId(), this._api, this._settings);
        popup.showOnClick(displayElement);
      }
    } else {
      displayElement.style.display = 'none';
    }

    document
      .querySelector('.ProfileNav-item:nth-of-type(4)')
      .insertAdjacentElement('afterend', displayElement);
  }

  isOnProfileScreen() {
    return Boolean(document.querySelector(PROFILE_SIDEBAR_SELECTOR));
  }

  hasAlreadyRun() {
    return Boolean(document.querySelector(`.${PROFILE_SCORE_EXTENSION_CLASS_NAME}`));
  }
}
