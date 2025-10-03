"use client";

import { useEffect } from "react";

const BODY_SHORTCUT_ATTRIBUTE = "cz-shortcut-listen";

export default function BodyHydrationFix() {
  useEffect(() => {
    const body = document.body;
    if (!body) {
      return;
    }

    if (body.hasAttribute(BODY_SHORTCUT_ATTRIBUTE)) {
      body.removeAttribute(BODY_SHORTCUT_ATTRIBUTE);
    }
  }, []);

  return null;
}
