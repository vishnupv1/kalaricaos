"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type MessageRow = {
  id: string;
  body: string | null;
  fromRole: string | null;
  fromName: string | null;
  sentAt: Date | string | null;
};

export function MetaConversationThread({ messages }: { messages: MessageRow[] }) {
  const [open, setOpen] = useState(false);

  if (messages.length === 0) {
    return <span className="text-xs text-muted-foreground">No message bodies stored</span>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        {open ? "Hide" : "View"} {messages.length} message{messages.length === 1 ? "" : "s"}
      </button>
      {open ? (
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/80 bg-muted/30 p-2">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isPage = message.fromRole === "PAGE";
  const when = message.sentAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
        new Date(message.sentAt),
      )
    : null;

  return (
    <div className={cn("flex", isPage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-2.5 py-1.5 text-xs",
          isPage ? "bg-primary/15 text-foreground" : "border border-border/60 bg-card text-foreground",
        )}
      >
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {isPage ? "Page" : (message.fromName ?? "Customer")}
          {when ? ` · ${when}` : null}
        </p>
        <p className="whitespace-pre-wrap break-words">{message.body ?? "—"}</p>
      </div>
    </div>
  );
}
