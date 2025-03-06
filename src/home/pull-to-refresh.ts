export function initPullToRefresh(onRefresh: () => Promise<void>) {
  let startY = 0;
  let currentY = 0;
  let isRefreshing = false;
  const indicator = createRefreshIndicator();
  const threshold = 150;

  document.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startY = e.touches[0].clientY;
    }
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (startY > 0 && !isRefreshing) {
        currentY = e.touches[0].clientY;
        const distance = currentY - startY;

        if (distance > 0) {
          e.preventDefault();
          indicator.style.transform = `translateY(${Math.min(distance / 2, threshold)}px)`;

          if (distance > threshold) {
            indicator.classList.add("ready");
          } else {
            indicator.classList.remove("ready");
          }
        }
      }
    },
    { passive: false }
  );

  document.addEventListener("touchend", () => {
    if (startY > 0 && !isRefreshing) {
      const distance = currentY - startY;
      startY = 0;
      currentY = 0;

      indicator.style.transform = "";

      if (distance > threshold) {
        isRefreshing = true;
        indicator.classList.add("refreshing");

        void (async () => {
          try {
            await onRefresh();
            // Let the spin and fadeOut animations complete
            await new Promise((resolve) => setTimeout(resolve, 6500)); // 1.5s for spin + 5s delay before fadeOut
          } finally {
            isRefreshing = false;
            indicator.classList.remove("refreshing", "ready");
          }
        })();
      }
    }
  });
}

function createRefreshIndicator(): HTMLDivElement {
  const indicator = document.createElement("div");
  indicator.className = "pull-refresh-indicator";
  indicator.innerHTML = `
    <div class="pull-refresh-spinner"></div>
  `;
  document.body.appendChild(indicator);
  return indicator;
}
