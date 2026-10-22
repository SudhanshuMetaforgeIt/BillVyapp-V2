import { AxiosError, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, api } from "./api-client";

describe("API validation integration", () => {
  const previous = apiClient.defaults.adapter;
  const adapter = vi.fn(async (config) => ({
    data: { ok: true },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  }));
  beforeEach(() => {
    adapter.mockClear();
    apiClient.defaults.adapter = adapter;
  });
  afterEach(() => {
    apiClient.defaults.adapter = previous;
  });
  it("rejects invalid form input before any network request", async () => {
    await expect(
      api.post("/customers", {
        firstName: "Riya",
        lastName: "Sharma",
        email: "invalid",
        phone: "123",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(adapter).not.toHaveBeenCalled();
  });
  it("sends valid normalized form input through the same authenticated client", async () => {
    await expect(
      api.post("/customers", {
        firstName: " Riya ",
        gender: "FEMALE",
        lastName: "Sharma",
        email: "riya@example.test",
        phone: "+14155552671",
      }),
    ).resolves.toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(JSON.parse(adapter.mock.calls[0][0].data as string)).toMatchObject({
      firstName: "Riya",
    });
  });
  it("normalizes URL queries without duplicating query parameters", async () => {
    await api.get("/products?page=1&isActive=false");
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe("/products");
    expect(adapter.mock.calls[0][0].params).toMatchObject({
      page: 1,
      isActive: false,
    });
  });
  it("preserves opaque signed URL query encoding", async () => {
    const url = "https://storage.example.test/file?token=a%2Fb%3D&expires=1";
    await api.get(url);
    expect(adapter.mock.calls[0][0].url).toBe(url);
  });
  it("continues to normalize real server authorization errors", async () => {
    apiClient.defaults.adapter = async (config) => {
      const response: AxiosResponse = {
        data: { message: "Access denied" },
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config,
      };
      throw new AxiosError(
        "Request failed",
        AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        response,
      );
    };
    await expect(api.get("/customers")).rejects.toEqual({
      status: 403,
      message: "Access denied",
    });
  });
});
