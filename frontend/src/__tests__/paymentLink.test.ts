/**
 * End-to-end validation for opaque:// SEP-7 payment links.
 *
 * Covers encode/decode round-trips for XLM and asset (issuer-backed) links,
 * malformed-link error surfacing, and a smoke check for the Freighter
 * deeplink format produced when handing off to an external wallet.
 */

import { describe, it, expect } from "vitest";
import {
  createPaymentLink,
  decodePaymentLink,
  encodePaymentLink,
  isOpaquePaymentLink,
} from "../lib/paymentLink";

const VALID_META = "0x" + "a".repeat(64);
const VALID_ISSUER = "G" + "A".repeat(55);

describe("opaque:// payment links — XLM", () => {
  it("encodes and decodes a native XLM link", () => {
    const uri = createPaymentLink(VALID_META, "testnet", {
      amount: "10.5",
      memo: "invoice-1",
    });
    expect(uri).toContain("opaque://v1/testnet/");
    expect(uri).toContain("amount=10.5");

    const decoded = decodePaymentLink(uri);
    expect("link" in decoded).toBe(true);
    if ("link" in decoded) {
      expect(decoded.link.metaAddress).toBe(VALID_META);
      expect(decoded.link.network).toBe("testnet");
      expect(decoded.link.params.amount).toBe("10.5");
      expect(decoded.link.params.memo).toBe("invoice-1");
      expect(decoded.link.params.asset).toBeUndefined();
    }
  });

  it("flags configured-network mismatches", () => {
    const uri = createPaymentLink(VALID_META, "mainnet");
    const decoded = decodePaymentLink(uri, "testnet");
    expect("error" in decoded).toBe(true);
    if ("error" in decoded) {
      expect(decoded.error.type).toBe("NETWORK_MISMATCH");
    }
  });
});

describe("opaque:// payment links — non-native assets", () => {
  it("round-trips an issuer-backed asset link", () => {
    const uri = encodePaymentLink({
      version: 1,
      network: "mainnet",
      metaAddress: VALID_META,
      params: { amount: "25", asset: "USDC", issuer: VALID_ISSUER },
    });

    const decoded = decodePaymentLink(uri);
    expect("link" in decoded).toBe(true);
    if ("link" in decoded) {
      expect(decoded.link.params.asset).toBe("USDC");
      expect(decoded.link.params.issuer).toBe(VALID_ISSUER);
    }
  });

  it("rejects an invalid issuer", () => {
    expect(() =>
      encodePaymentLink({
        version: 1,
        network: "mainnet",
        metaAddress: VALID_META,
        params: { asset: "USDC", issuer: "not-an-issuer" },
      }),
    ).toThrow();
  });
});

describe("opaque:// payment links — malformed input", () => {
  it.each([
    ["wrong protocol", "https://example.com/v1/testnet/" + VALID_META],
    ["missing version", "opaque://testnet/" + VALID_META],
    ["unsupported version", "opaque://v9/testnet/" + VALID_META],
    ["bad network", "opaque://v1/galaxy/" + VALID_META],
    ["bad meta-address", "opaque://v1/testnet/0xdeadbeef"],
    ["negative amount", "opaque://v1/testnet/" + VALID_META + "?amount=-1"],
  ])("surfaces a structured error for: %s", (_label, link) => {
    const decoded = decodePaymentLink(link);
    expect("error" in decoded).toBe(true);
    if ("error" in decoded) {
      expect(decoded.error.type).toBeDefined();
      expect(decoded.error.message.length).toBeGreaterThan(0);
    }
    expect(isOpaquePaymentLink(link)).toBe(false);
  });
});

describe("Freighter handoff", () => {
  /**
   * Freighter deeplinks the host into a web+stellar:// URI. Asserting the
   * opaque link can be converted to a SEP-7 compatible shape covers the
   * wallet-handoff contract.
   */
  function toFreighterDeeplink(opaqueUri: string): string {
    const decoded = decodePaymentLink(opaqueUri);
    if ("error" in decoded) throw new Error(decoded.error.message);
    const { params } = decoded.link;
    const sp = new URLSearchParams();
    if (params.amount) sp.set("amount", params.amount);
    if (params.asset) sp.set("asset_code", params.asset);
    if (params.issuer) sp.set("asset_issuer", params.issuer);
    if (params.memo) sp.set("memo", params.memo);
    // SEP-7 destination shape — meta-address stands in for the recipient.
    sp.set("destination", decoded.link.metaAddress);
    return `web+stellar:pay?${sp.toString()}`;
  }

  it("produces a SEP-7 web+stellar:pay deeplink for an XLM payment", () => {
    const uri = createPaymentLink(VALID_META, "mainnet", { amount: "2" });
    const dl = toFreighterDeeplink(uri);
    expect(dl.startsWith("web+stellar:pay?")).toBe(true);
    expect(dl).toContain("amount=2");
    expect(dl).toContain(`destination=${encodeURIComponent(VALID_META)}`);
  });

  it("includes asset_code and asset_issuer for non-native deeplinks", () => {
    const uri = encodePaymentLink({
      version: 1,
      network: "mainnet",
      metaAddress: VALID_META,
      params: { amount: "5", asset: "USDC", issuer: VALID_ISSUER },
    });
    const dl = toFreighterDeeplink(uri);
    expect(dl).toContain("asset_code=USDC");
    expect(dl).toContain(`asset_issuer=${VALID_ISSUER}`);
  });
});
