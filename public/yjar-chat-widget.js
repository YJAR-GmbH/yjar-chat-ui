(function () {
    if (window.YJAR_CHAT_WIDGET_LOADED) return;
    window.YJAR_CHAT_WIDGET_LOADED = true;
  
    function createWidget() {
      if (document.getElementById("yjar-chat-widget-root")) return;
  
      var doc = document;
  
      var root = doc.createElement("div");
      root.id = "yjar-chat-widget-root";
      doc.body.appendChild(root);
  
      var bubble = doc.createElement("button");
      bubble.id = "yjar-chat-widget-button";
      bubble.type = "button";
  
      // Verhindert doppelte Initialisierung
      bubble.style.position = "fixed";
      bubble.style.bottom = "20px";
      bubble.style.right = "20px";
      bubble.style.width = "56px";
      bubble.style.height = "56px";
      bubble.style.borderRadius = "9999px";
      bubble.style.border = "none";
      bubble.style.cursor = "pointer";
      bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      bubble.style.background = "#1c3d5a";
      bubble.style.color = "#ffffff";
      bubble.style.zIndex = "999999";
      bubble.style.display = "flex";
      bubble.style.alignItems = "center";
      bubble.style.justifyContent = "center";
      bubble.style.fontSize = "24px";
      bubble.style.padding = "0";
  
      bubble.setAttribute("aria-label", "YJAR Chat");
      bubble.innerHTML = "💬";
  
      var panel = doc.createElement("div");
      panel.id = "yjar-chat-widget-panel";
  
      panel.style.position = "fixed";
      panel.style.bottom = "90px";
      panel.style.right = "20px";
      panel.style.width = "380px";
      panel.style.maxWidth = "100vw";
      panel.style.height = "520px";
      panel.style.maxHeight = "80vh";
      panel.style.boxShadow = "0 10px 40px rgba(15,23,42,0.35)";
      panel.style.borderRadius = "16px";
      panel.style.overflow = "hidden";
      panel.style.background = "#ffffff";
      panel.style.zIndex = "999999";
      panel.style.display = "none";
  
      var iframe = doc.createElement("iframe");
      iframe.id = "yjar-chat-widget-iframe";
  
     
      iframe.src = "https://yjar-chat-ui.vercel.app/widget";
  
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
  
      panel.appendChild(iframe);
  
      root.appendChild(bubble);
      root.appendChild(panel);
  
      var isOpen = false;
      bubble.addEventListener("click", function () {
        isOpen = !isOpen;
        panel.style.display = isOpen ? "block" : "none";
      });
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createWidget);
    } else {
      createWidget();
    }
  })();
  