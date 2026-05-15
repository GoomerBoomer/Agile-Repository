(function () {
  "use strict";

  var nav = document.querySelector(".header-nav");
  if (!nav) return;

  var bellWrapper = document.createElement("div");
  bellWrapper.style.display = "none";
  bellWrapper.className = "notif-bell-wrapper";
  bellWrapper.innerHTML =
    '<button class="notif-bell-btn" aria-label="Notifications" title="Notifications">' +
    '<svg class="notif-bell-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
    '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
    "</svg>" +
    '<span class="notif-badge" style="display:none;">0</span>' +
    "</button>" +
    '<div class="notif-dropdown" style="display:none;">' +
    '<div class="notif-dropdown-header">' +
    "<strong>Notifications</strong>" +
    '<button class="notif-mark-all-btn">Mark all read</button>' +
    "</div>" +
    '<div class="notif-dropdown-body">' +
    '<p class="notif-empty">No notifications yet.</p>' +
    "</div>" +
    "</div>";

  nav.insertBefore(bellWrapper, nav.firstChild);

  var badge = bellWrapper.querySelector(".notif-badge");
  var dropdown = bellWrapper.querySelector(".notif-dropdown");
  var dropdownBody = bellWrapper.querySelector(".notif-dropdown-body");
  var bellBtn = bellWrapper.querySelector(".notif-bell-btn");
  var markAllBtn = bellWrapper.querySelector(".notif-mark-all-btn");
  var isOpen = false;

  function formatType(type) {
    switch (type) {
      case "comment":
        return "commented on";
      case "upvote":
        return "upvoted";
      case "downvote":
        return "downvoted";
      default:
        return "interacted with";
    }
  }

  function typeIcon(type) {
    switch (type) {
      case "comment":
        return "\uD83D\uDCAC";
      case "upvote":
        return "\u25B2";
      case "downvote":
        return "\u25BC";
      default:
        return "\uD83D\uDD14";
    }
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    return days + "d ago";
  }

  function updateBadge(count) {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  }

  function renderNotifications(items) {
    if (!items || items.length === 0) {
      dropdownBody.innerHTML =
        '<p class="notif-empty">No notifications yet.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var n = items[i];
      var cls = "notif-item" + (n.is_read ? "" : " notif-unread");
      html +=
        '<a href="/posts/show/' +
        n.resource_id +
        '" class="' +
        cls +
        '" data-id="' +
        n.id +
        '">' +
        '<span class="notif-type-icon">' +
        typeIcon(n.type) +
        "</span>" +
        '<span class="notif-text"><strong>' +
        escapeHtml(n.actor_name) +
        "</strong> " +
        formatType(n.type) +
        ' your post "<em>' +
        escapeHtml(n.post_title) +
        '</em>"</span>' +
        '<span class="notif-time">' +
        timeAgo(n.created_at) +
        "</span>" +
        "</a>";
    }
    dropdownBody.innerHTML = html;

    var notifItems = dropdownBody.querySelectorAll(".notif-item[data-id]");
    for (var j = 0; j < notifItems.length; j++) {
      (function (el) {
        el.addEventListener("click", function () {
          var nid = el.getAttribute("data-id");
          if (el.classList.contains("notif-unread")) {
            markRead(nid);
          }
        });
      })(notifItems[j]);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  function fetchNotifications() {
    fetch("/notifications/api/list", { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) {
          bellWrapper.style.display = "none";
          return null;
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        bellWrapper.style.display = "block";
        updateBadge(data.unreadCount);
        renderNotifications(data.notifications);
      })
      .catch(function () {
        bellWrapper.style.display = "none";
      });
  }

  function markRead(id) {
    fetch("/notifications/api/mark-read/" + id, {
      method: "POST",
      credentials: "same-origin",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.success) updateBadge(data.unreadCount);
      });
  }

  function markAllRead() {
    fetch("/notifications/api/mark-all-read", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.success) {
          updateBadge(0);
          var unreadEls = dropdownBody.querySelectorAll(".notif-unread");
          for (var i = 0; i < unreadEls.length; i++) {
            unreadEls[i].classList.remove("notif-unread");
          }
        }
      });
  }

  bellBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    isOpen = !isOpen;
    dropdown.style.display = isOpen ? "" : "none";
    if (isOpen) fetchNotifications();
  });

  markAllBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    markAllRead();
  });

  document.addEventListener("click", function (e) {
    if (isOpen && !bellWrapper.contains(e.target)) {
      isOpen = false;
      dropdown.style.display = "none";
    }
  });

  // SSE for real-time updates
  if (typeof EventSource !== "undefined") {
    var es = new EventSource("/notifications/stream");

    es.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === "new_notification") {
          updateBadge(data.unreadCount);
          if (isOpen) fetchNotifications();
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    es.onerror = function () {
      // SSE will auto-reconnect
    };
  }

  // Initial fetch
  fetchNotifications();
})();
