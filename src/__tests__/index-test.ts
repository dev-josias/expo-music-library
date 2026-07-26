const mockPage = {
  assets: [],
  endCursor: "",
  hasNextPage: false,
  totalCount: 0,
};

const mockNativeModule = {
  getAssetsAsync: jest.fn(async () => mockPage),
  searchAssetsAsync: jest.fn(async () => mockPage),
  getFolderAssetsAsync: jest.fn(async () => mockPage),
  getAlbumAssetsAsync: jest.fn(async () => mockPage),
  getArtistAssetsAsync: jest.fn(async () => mockPage),
  getGenreAssetsAsync: jest.fn(async () => mockPage),
  getAssetByIdAsync: jest.fn(async () => ({})),
  getCapabilitiesAsync: jest.fn(async () => ({
    playlists: true,
    directories: false,
    cloudItems: true,
    protectedAssets: true,
    uriSchemes: ["ipod-library"],
  })),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};

jest.doMock("../ExpoMusicLibraryModule", () => ({
  __esModule: true,
  default: mockNativeModule,
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
  getAlbumAssetsAsync,
  getAssetsAsync,
  getCapabilitiesAsync,
  searchAssetsAsync,
} = require("../index");

describe("ExpoMusicLibrary JavaScript API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports safe constants even when native constants are absent", () => {
    expect(MediaType).toEqual({ audio: "audio" });
    expect(SortBy.title).toBe("title");
  });

  it("normalizes a single sort tuple without treating it as a list", async () => {
    await getAssetsAsync({
      first: 25,
      after: "opaque-next-page",
      sortBy: ["title", true],
      availability: "hasAssetUrl",
      artwork: "none",
    });

    expect(mockNativeModule.getAssetsAsync).toHaveBeenCalledWith({
      first: 25,
      after: "opaque-next-page",
      album: undefined,
      artist: undefined,
      genre: undefined,
      sortBy: ["title ASC"],
      createdAfter: undefined,
      createdBefore: undefined,
      availability: "hasAssetUrl",
      artwork: "none",
    });
  });

  it("normalizes a list of sort values and valid date filters", async () => {
    const createdAfter = new Date("2024-01-01T00:00:00.000Z");
    const createdBefore = createdAfter.getTime() + 1000;

    await getAssetsAsync({
      sortBy: [["artist", true], "album"],
      createdAfter,
      createdBefore,
    });

    expect(mockNativeModule.getAssetsAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: ["artist ASC", "album DESC"],
        createdAfter: createdAfter.getTime(),
        createdBefore,
        availability: "all",
        artwork: "legacy",
      })
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1001])(
    "rejects invalid page size %p",
    async (first) => {
      await expect(getAssetsAsync({ first })).rejects.toThrow(
        "finite integer between 1 and 1000"
      );
    }
  );

  it("rejects malformed IDs, cursors, dates, and query modes", async () => {
    await expect(getAssetsAsync([] as never)).rejects.toThrow(
      "options must be an object"
    );
    await expect(
      getAssetsAsync({ album: { id: " " } as never })
    ).rejects.toThrow("non-empty ID string");
    await expect(
      getAssetsAsync({ after: "" })
    ).rejects.toThrow("non-empty ID string");
    await expect(
      getAssetsAsync({ createdAfter: new Date("invalid") })
    ).rejects.toThrow("valid Date");
    await expect(
      getAssetsAsync({ createdAfter: 2, createdBefore: 1 })
    ).rejects.toThrow("earlier than or equal");
    await expect(
      getAssetsAsync({ availability: "local" as never })
    ).rejects.toThrow('Option "availability"');
    await expect(
      getAssetsAsync({ artwork: "base64" as never })
    ).rejects.toThrow('Option "artwork"');
  });

  it("validates subquery IDs and applies query defaults", async () => {
    await getAlbumAssetsAsync("album-1", { sortBy: "title" });
    expect(mockNativeModule.getAlbumAssetsAsync).toHaveBeenCalledWith(
      "album-1",
      {
        first: 20,
        after: null,
        sortBy: ["title DESC"],
        availability: "all",
        artwork: "legacy",
      }
    );

    await expect(getAlbumAssetsAsync(" ")).rejects.toThrow(
      "non-empty ID string"
    );
  });

  it("uses the same validation for search and trims the query", async () => {
    await searchAssetsAsync("  Beatles  ", {
      first: 10,
      sortBy: ["artist", true],
    });
    expect(mockNativeModule.searchAssetsAsync).toHaveBeenCalledWith(
      "Beatles",
      expect.objectContaining({
        first: 10,
        sortBy: ["artist ASC"],
      })
    );

    await expect(searchAssetsAsync("   ")).rejects.toThrow(
      "non-empty string"
    );
    await expect(searchAssetsAsync("valid", { first: 0 })).rejects.toThrow(
      "finite integer"
    );
  });

  it("exposes native capabilities and coarse reload events", async () => {
    await expect(getCapabilitiesAsync()).resolves.toEqual(
      expect.objectContaining({ cloudItems: true })
    );

    const listener = jest.fn();
    const subscription = addChangeListener(listener);
    expect(mockNativeModule.addListener).toHaveBeenCalledWith(
      "onChange",
      listener
    );
    expect(subscription).toHaveProperty("remove");
  });
});
