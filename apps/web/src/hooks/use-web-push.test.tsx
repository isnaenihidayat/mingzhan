import { afterEach, expect, spyOn, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { client } from "@/lib/client";
import { usePushPresence } from "./use-web-push";

const noop = async () => {};

const auth: AuthContextValue = {
  activeOrg: null,
  archiveOrg: noop,
  createOrg: noop,
  isAuthenticated: true,
  isLoading: false,
  login: async () => {
    throw new Error("Login is not used by this fixture");
  },
  logout: noop,
  orgs: [],
  platformOrgs: [],
  platformOrgsError: false,
  refreshPlatformOrgs: noop,
  refreshSession: noop,
  setup: noop,
  switchOrg: noop,
  updateOrg: noop,
  user: null,
};

let root: Root | undefined;

let restoreCrypto: (() => void) | undefined;

let presence:
  | ReturnType<typeof spyOn<typeof client, "setPushPresence">>
  | undefined;

afterEach(async () => {
  await act(() => root?.unmount());
  root = undefined;
  presence?.mockRestore();
  restoreCrypto?.();
  document.body.innerHTML = "";
});

function PresenceProbe() {
  usePushPresence();

  return <div>Chat ready</div>;
}

test("authenticated chat reports presence on HTTP without crypto.randomUUID", async () => {
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: undefined,
  });
  restoreCrypto = () => {
    if (original) {
      Object.defineProperty(crypto, "randomUUID", original);
    } else {
      Reflect.deleteProperty(crypto, "randomUUID");
    }
  };

  presence = spyOn(client, "setPushPresence").mockResolvedValue(undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(() =>
    root?.render(
      <AuthContext.Provider value={auth}>
        <PresenceProbe />
      </AuthContext.Provider>
    )
  );
  expect(document.body.textContent).toContain("Chat ready");
  expect(presence).toHaveBeenCalledTimes(1);
  const id = presence.mock.calls[0][0];
  expect(id.length).toBeGreaterThan(0);
  expect(id.length).toBeLessThanOrEqual(64);
  await act(() => root?.unmount());
  root = undefined;
  expect(presence.mock.calls.at(-1)).toEqual([id, false]);
});
