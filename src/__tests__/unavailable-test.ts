jest.doMock("../ExpoMusicLibraryModule", () => ({
  __esModule: true,
  default: null,
}));

jest.doMock("expo-modules-core", () => ({
  UnavailabilityError: class UnavailabilityError extends Error {
    constructor(moduleName: string, methodName: string) {
      super(`${moduleName}.${methodName} is unavailable`);
    }
  },
}));

const {
  MediaType,
  SortBy,
  addChangeListener,
  getAssetsAsync,
  isAvailableAsync,
} = require("../index");

describe("unsupported platform behavior", () => {
  it("can be imported and queried for availability without a native module", async () => {
    expect(MediaType.audio).toBe("audio");
    expect(SortBy.default).toBe("default");
    await expect(isAvailableAsync()).resolves.toBe(false);
  });

  it("throws an availability error only when a native operation is used", async () => {
    await expect(getAssetsAsync()).rejects.toThrow(
      "ExpoMusicLibrary.getAssetsAsync is unavailable"
    );
    expect(() => addChangeListener(jest.fn())).toThrow(
      "ExpoMusicLibrary.addListener is unavailable"
    );
  });
});
