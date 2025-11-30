(function () {
    if (window.YJAR_CHAT_WIDGET_LOADED) return;
    window.YJAR_CHAT_WIDGET_LOADED = true;
  
    function createWidget() {
      if (document.getElementById("yjar-chat-widget-root")) return;
  
      var doc = document;
  
      // Root-Container hat keinen Einfluss auf das Layout der Seite
      var root = doc.createElement("div");
      root.id = "yjar-chat-widget-root";
      root.style.position = "fixed";
      root.style.top = "0";
      root.style.left = "0";
      root.style.width = "0";
      root.style.height = "0";
      root.style.zIndex = "999998";
      doc.body.appendChild(root);
  
      // Chat-Button (runde Blase unten rechts)
      var bubble = doc.createElement("button");
      bubble.id = "yjar-chat-widget-button";
      bubble.type = "button";
  
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
  
      // Text-Badge neben dem Button: "Chatten Sie mit uns"
      var label = doc.createElement("div");
      label.id = "yjar-chat-widget-label";
  
      label.textContent = "Chatten Sie mit uns";
      label.style.position = "fixed";
      label.style.bottom = "28px";
      label.style.right = "90px";
      label.style.padding = "8px 14px";
      label.style.borderRadius = "9999px";
      label.style.background = "#ffffff";
      label.style.color = "#1c3d5a";
      label.style.fontSize = "14px";
      label.style.fontWeight = "500";
      label.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
      label.style.zIndex = "999999";
      label.style.whiteSpace = "nowrap";
  
      // Panel für das Chat-Fenster
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
      panel.style.overflow = "hidden"; // nur innerer Chat scrollt
      panel.style.background = "#020617"; // dunkler Hintergrund
      panel.style.zIndex = "999999";
      panel.style.display = "none";
  
      // Iframe mit der Widget-Seite
      var iframe = doc.createElement("iframe");
      iframe.id = "yjar-chat-widget-iframe";
      iframe.src = "https://yjar-chat-ui.vercel.app/widget";
  
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
  
      panel.appendChild(iframe);
  
      root.appendChild(bubble);
      root.appendChild(label);
      root.appendChild(panel);
  
      // Öffnen / Schließen, Label nur bei geschlossenem Chat
      var isOpen = false;
      bubble.addEventListener("click", function () {
        isOpen = !isOpen;
        panel.style.display = isOpen ? "block" : "none";
  
        if (label) {
          label.style.display = isOpen ? "none" : "block";
        }
      });
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createWidget);
    } else {
      createWidget();
    }
  })();
  