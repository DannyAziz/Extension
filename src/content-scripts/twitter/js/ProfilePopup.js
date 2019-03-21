import { CONFIG, MESSAGES } from '../../../config';

let openPopupsCloseHandlers = [];

export class ProfilePopup {
  api;
  userTwitterId;
  settings;

  constructor(userTwitterId, api, settings) {
    this.userTwitterId = userTwitterId;
    this.api = api;
    this.settings = settings;
  }

  async showOnClick(displayElement) {
    const clusters = await this.api.getTwitterUserClusters(this.userTwitterId);
    const topFollowersCluster = await this.settings.getOptionValue('topFollowersCluster');
    const { followers } = await this.api.getTwitterUserScore(
      this.userTwitterId,
      topFollowersCluster
    );

    let popupNode, closePopup;

    const displayPopup = event => {
      const POPUP_CLASS = 'HiveExtension-Twitter_popup-profile';
      const POPUP_HIDDEN_CLASS = `${POPUP_CLASS}-hidden`;

      const removePopupElement = () => {
        displayElement.querySelector(`.${POPUP_CLASS}`).remove();
        document.removeEventListener('click', closePopup);

        if (openPopupsCloseHandlers.length === 1) {
          openPopupsCloseHandlers = [];
        }
      };

      const closeAllPopups = () => {
        openPopupsCloseHandlers.forEach(popupCloseHandler => popupCloseHandler(event));
        openPopupsCloseHandlers = [];
      };

      event.stopPropagation();

      if (displayElement.querySelector(`.${POPUP_CLASS}`)) {
        if (popupNode && (event.target !== popupNode && !popupNode.contains(event.target))) {
          closeAllPopups();
        }

        return;
      }

      closeAllPopups();

      popupNode = document.createElement('div');
      popupNode.classList.add(POPUP_CLASS);

      if (this.settings.isDarkTheme) {
        popupNode.classList.add(`${POPUP_CLASS}-dark`);
      }

      popupNode.classList.add(POPUP_HIDDEN_CLASS);

      let clustersHTML = ``;

      clusters.map(cluster => {
        if (cluster.abbr === 'Crypto') {
          return;
        }

        const roundedScore = Math.round(cluster.score);
        const percentage = Math.floor((roundedScore / CONFIG.MAX_SCORE) * 100);

        clustersHTML += `
              <div class="HiveExtension-Twitter_popup-profile_cluster-score">
                  <div class="HiveExtension-Twitter_popup-profile_cluster-score_left">
                      ${cluster.display}
                  </div>
                  <div class="HiveExtension-Twitter_popup-profile_cluster-score_right">
                      <span class="HiveExtension-Twitter_popup-profile_cluster-score_right_bold">${roundedScore}</span>
                      <span class="HiveExtension-Twitter_popup-profile_cluster-score_right_small">/ 1000</span>
                  </div>
                  <div class="HiveExtension-Twitter_popup-profile_cluster-score_progress-bar">
                      <div class="HiveExtension-Twitter_popup-profile_cluster-score_progress-bar_bg"></div>
                      <div class="HiveExtension-Twitter_popup-profile_cluster-score_progress-bar_progress" style="width:${percentage}%"></div>
                  </div>
              </div>
              `;
      });

      let FOLLOWERS_HTML = '';

      if (followers) {
        followers.forEach(({ screenName }) => {
          FOLLOWERS_HTML += `
                        <div class="${POPUP_CLASS}_followers_follower">
                            <img class="${POPUP_CLASS}_followers_follower_image" src="https://twitter.com/${screenName}/profile_image?size=mini" />
                            <div class="${POPUP_CLASS}_followers_follower_name">${screenName}</div>
                        </div>
                    `;
        });
      }

      const CUSTOM_HTML = `
                <div class="${POPUP_CLASS}_content">
                    ${clustersHTML}
                </div>
                <br/>
                <h3 class="${POPUP_CLASS}_title">Top Followers</h3>
                <div class="${POPUP_CLASS}_followers">
                    ${FOLLOWERS_HTML}
                </div>
                <br/>
                <a href="https://hive.one/profile/${
                  this.userTwitterId
                }" class="${POPUP_CLASS}_credit">
                  Learn more about this profile at hive.one
                  <svg viewBox="0 0 36 36" class="${POPUP_CLASS}_credit_icon">
                    <use xlink:href="#hive-icon" />
                  </svg>
                </a>
          `;
      popupNode.innerHTML = CUSTOM_HTML;

      displayElement.appendChild(popupNode);

      const { top } = popupNode.getBoundingClientRect();

      const offsetFromTrigger = 6;
      const collidingElementsHeight = 50;

      const positionChange = popupNode.offsetHeight + offsetFromTrigger;

      let newTopChange = -(popupNode.offsetHeight + offsetFromTrigger);

      if (top >= positionChange + collidingElementsHeight) {
        popupNode.style.top = `${newTopChange}px`;
      }

      popupNode.classList.remove(POPUP_HIDDEN_CLASS);

      setTimeout(() => {
        closePopup = event => {
          if (event.target === popupNode || popupNode.contains(event.target)) {
            return;
          }

          event.stopPropagation();

          removePopupElement();
        };

        document.addEventListener('click', closePopup);

        openPopupsCloseHandlers.push(closePopup);
      }, 0);

      let action = 'popup-opened-in-tweet-stream';

      if (displayElement.classList.contains('ProfileNav-item')) {
        action = 'popup-opened-in-profile-header';
      }

      chrome.runtime.sendMessage({
        type: MESSAGES.TRACK_EVENT,
        category: 'plugin-interactions',
        action
      });
    };

    displayElement.addEventListener('click', displayPopup, false);
  }
}
