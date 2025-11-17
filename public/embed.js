(function () {
    // ------- Button -------
    const btn = document.createElement("div");
    btn.innerText = "Chat";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.padding = "12px 18px";
    btn.style.background = "#1e40af";
    btn.style.color = "#fff";
    btn.style.borderRadius = "24px";
    btn.style.fontSize = "14px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    btn.style.zIndex = "999999";
    document.body.appendChild(btn);
  
    // ------- Iframe -------
    const iframe = document.createElement("iframe");
    iframe.src = window.YJAR_CHAT_WIDGET_URL || "/widget";
    iframe.style.position = "fixed";
    iframe.style.bottom = "70px";
    iframe.style.right = "20px";
    iframe.style.width = "380px";
    iframe.style.height = "500px";
    iframe.style.border = "0";
    iframe.style.borderRadius = "12px";
    iframe.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
    iframe.style.zIndex = "999998";
    iframe.style.display = "none";
    iframe.style.background = "#fff";
    document.body.appendChild(iframe);
  
    // ------- Toggle -------
    let open = false;
  
    btn.onclick = () => {
      open = !open;
      iframe.style.display = open ? "block" : "none";
    };
  })();
  