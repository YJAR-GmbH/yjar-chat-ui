"use client";

import ChatUI from "@/components/ChatUI";

export default function WidgetPage() {
  return (
    <div className="h-full w-full">
      {/* Vollflächiger Chat im Widget, ohne zusätzliches Scrollen */}
      <ChatUI variant="dark" />
    </div>
  );
}
