// Copyright 2015-present 650 Industries. All rights reserved.

// Music Library Image Loader - handles loading artwork from music library assets
// Supports custom URI schemes for music artwork loading
#if __has_include(<React/RCTImageURLLoader.h>)

#import <Photos/Photos.h>
#import <MediaPlayer/MediaPlayer.h>
#import <React/RCTDefines.h>
#import <React/RCTUtils.h>
#import <React/RCTBridgeModule.h>
#import "MusicLibraryImageLoader.h"

@implementation MusicLibraryImageLoader

RCT_EXPORT_MODULE()

#pragma mark - RCTImageURLLoader

- (BOOL)canLoadImageURL:(NSURL *)requestURL
{
  if (!requestURL) {
    return NO;
  }
  
  // Support both ph:// (for Photos-based artwork) and music-artwork:// (for music-specific artwork)
  return [requestURL.scheme caseInsensitiveCompare:@"ph"] == NSOrderedSame ||
         [requestURL.scheme caseInsensitiveCompare:@"music-artwork"] == NSOrderedSame ||
         [requestURL.scheme caseInsensitiveCompare:@"assets-library"] == NSOrderedSame;
}

- (RCTImageLoaderCancellationBlock)loadImageForURL:(NSURL *)imageURL
                                              size:(CGSize)size
                                             scale:(CGFloat)scale
                                        resizeMode:(RCTResizeMode)resizeMode
                                   progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                                partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                                 completionHandler:(RCTImageLoaderCompletionBlock)completionHandler
{
  if (!imageURL) {
    completionHandler(RCTErrorWithMessage(@"Cannot load artwork with no URL"), nil);
    return ^{};
  }
  
  // Check music library permission
  if ([MPMediaLibrary authorizationStatus] != MPMediaLibraryAuthorizationStatusAuthorized) {
    completionHandler(RCTErrorWithMessage(@"Music Library permission required to load artwork"), nil);
    return ^{};
  }
  
  NSString *scheme = [imageURL.scheme lowercaseString];
  
  if ([scheme isEqualToString:@"music-artwork"]) {
    // Handle custom music artwork URIs: music-artwork://persistentID
    return [self loadMusicArtworkForURL:imageURL
                                   size:size
                                  scale:scale
                             resizeMode:resizeMode
                        progressHandler:progressHandler
                     partialLoadHandler:partialLoadHandler
                      completionHandler:completionHandler];
  }
  else if ([scheme isEqualToString:@"ph"] || [scheme isEqualToString:@"assets-library"]) {
    // Handle Photos-based artwork (fallback to original Photos implementation)
    return [self loadPhotosArtworkForURL:imageURL
                                    size:size
                                   scale:scale
                              resizeMode:resizeMode
                         progressHandler:progressHandler
                      partialLoadHandler:partialLoadHandler
                       completionHandler:completionHandler];
  }
  
  completionHandler(RCTErrorWithMessage(@"Unsupported artwork URL scheme"), nil);
  return ^{};
}

#pragma mark - Music Artwork Loading

- (RCTImageLoaderCancellationBlock)loadMusicArtworkForURL:(NSURL *)imageURL
                                                     size:(CGSize)size
                                                    scale:(CGFloat)scale
                                               resizeMode:(RCTResizeMode)resizeMode
                                          progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                                       partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                                        completionHandler:(RCTImageLoaderCompletionBlock)completionHandler
{
  // Extract persistent ID from music-artwork://persistentID
  NSString *persistentIDString = [imageURL.absoluteString substringFromIndex:@"music-artwork://".length];
  uint64_t persistentID = [persistentIDString longLongValue];
  
  if (persistentID == 0) {
    completionHandler(RCTErrorWithMessage(@"Invalid persistent ID in music artwork URL"), nil);
    return ^{};
  }
  
  // Find the music item
  MPMediaQuery *query = [MPMediaQuery songsQuery];
  MPMediaPropertyPredicate *predicate = [MPMediaPropertyPredicate
    predicateWithValue:@(persistentID)
    forProperty:MPMediaItemPropertyPersistentID];
  [query addFilterPredicate:predicate];
  
  NSArray<MPMediaItem *> *items = [query items];
  if (items.count == 0) {
    completionHandler(RCTErrorWithMessage(@"Music item not found for artwork loading"), nil);
    return ^{};
  }
  
  MPMediaItem *item = items.firstObject;
  MPMediaItemArtwork *artwork = item.artwork;
  
  if (!artwork) {
    completionHandler(RCTErrorWithMessage(@"No artwork available for this music item"), nil);
    return ^{};
  }
  
  // Calculate target size
  CGSize targetSize;
  if (CGSizeEqualToSize(size, CGSizeZero)) {
    // Use a reasonable default size for artwork
    targetSize = CGSizeMake(300, 300);
  } else {
    targetSize = CGSizeApplyAffineTransform(size, CGAffineTransformMakeScale(scale, scale));
  }
  
  // Get artwork image
  UIImage *artworkImage = [artwork imageWithSize:targetSize];
  
  if (artworkImage) {
    // Report progress if handler exists
    if (progressHandler) {
      progressHandler(1000000, 1000000); // 100% progress
    }
    completionHandler(nil, artworkImage);
  } else {
    completionHandler(RCTErrorWithMessage(@"Failed to load artwork image"), nil);
  }
  
  // Return cancellation block (though music artwork loading is synchronous)
  return ^{
    // Nothing to cancel for synchronous music artwork loading
  };
}

#pragma mark - Photos Artwork Loading (Fallback)

- (RCTImageLoaderCancellationBlock)loadPhotosArtworkForURL:(NSURL *)imageURL
                                                      size:(CGSize)size
                                                     scale:(CGFloat)scale
                                                resizeMode:(RCTResizeMode)resizeMode
                                           progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                                        partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                                         completionHandler:(RCTImageLoaderCompletionBlock)completionHandler
{
  // Check if PHAsset is available
  if (![PHAsset class]) {
    completionHandler(RCTErrorWithMessage(@"PhotoKit not available"), nil);
    return ^{};
  }
  
  // Extract asset ID from URL
  NSString *assetID = @"";
  PHFetchResult *results;
  
  if ([imageURL.scheme caseInsensitiveCompare:@"assets-library"] == NSOrderedSame) {
    assetID = [imageURL absoluteString];
    results = [PHAsset fetchAssetsWithALAssetURLs:@[imageURL] options:nil];
  } else {
    assetID = [imageURL.absoluteString substringFromIndex:@"ph://".length];
    results = [PHAsset fetchAssetsWithLocalIdentifiers:@[assetID] options:nil];
  }
  
  if (results.count == 0) {
    NSString *errorText = [NSString stringWithFormat:@"Failed to fetch PHAsset with local identifier %@", assetID];
    completionHandler(RCTErrorWithMessage(errorText), nil);
    return ^{};
  }

  PHAsset *asset = [results firstObject];
  PHImageRequestOptions *imageOptions = [PHImageRequestOptions new];

  // Allow PhotoKit to fetch images from iCloud
  imageOptions.networkAccessAllowed = YES;

  if (progressHandler) {
    imageOptions.progressHandler = ^(double progress, NSError *error, BOOL *stop, NSDictionary<NSString *, id> *info) {
      static const double multiplier = 1e6;
      progressHandler(progress * multiplier, multiplier);
    };
  }

  imageOptions.deliveryMode = PHImageRequestOptionsDeliveryModeHighQualityFormat;

  BOOL useMaximumSize = CGSizeEqualToSize(size, CGSizeZero);
  CGSize targetSize;
  if (useMaximumSize) {
    targetSize = PHImageManagerMaximumSize;
    imageOptions.resizeMode = PHImageRequestOptionsResizeModeNone;
  } else {
    targetSize = CGSizeApplyAffineTransform(size, CGAffineTransformMakeScale(scale, scale));
    imageOptions.resizeMode = PHImageRequestOptionsResizeModeFast;
  }

  PHImageContentMode contentMode = PHImageContentModeAspectFill;
  if (resizeMode == RCTResizeModeContain) {
    contentMode = PHImageContentModeAspectFit;
  }

  PHImageRequestID requestID =
  [[PHImageManager defaultManager] requestImageForAsset:asset
                                             targetSize:targetSize
                                            contentMode:contentMode
                                                options:imageOptions
                                          resultHandler:^(UIImage *result, NSDictionary<NSString *, id> *info) {
    if (result) {
      completionHandler(nil, result);
    } else {
      completionHandler(info[PHImageErrorKey], nil);
    }
  }];

  return ^{
    [[PHImageManager defaultManager] cancelImageRequest:requestID];
  };
}

@end

#endif
