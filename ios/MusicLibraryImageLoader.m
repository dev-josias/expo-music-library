// Copyright 2015-present 650 Industries. All rights reserved.

#if __has_include(<React/RCTImageURLLoader.h>)

#import <errno.h>
#import <math.h>
#import <MediaPlayer/MediaPlayer.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <stdlib.h>
#import "MusicLibraryImageLoader.h"

@implementation MusicLibraryImageLoader

RCT_EXPORT_MODULE()

- (BOOL)canLoadImageURL:(NSURL *)requestURL
{
  return requestURL != nil &&
    [requestURL.scheme caseInsensitiveCompare:@"music-artwork"] == NSOrderedSame;
}

- (RCTImageLoaderCancellationBlock)loadImageForURL:(NSURL *)imageURL
                                              size:(CGSize)size
                                             scale:(CGFloat)scale
                                        resizeMode:(RCTResizeMode)resizeMode
                                   progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                                partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                                 completionHandler:(RCTImageLoaderCompletionBlock)completionHandler
{
  if (![self canLoadImageURL:imageURL]) {
    completionHandler(RCTErrorWithMessage(@"Unsupported artwork URL scheme"), nil);
    return ^{};
  }

  if ([MPMediaLibrary authorizationStatus] != MPMediaLibraryAuthorizationStatusAuthorized) {
    completionHandler(RCTErrorWithMessage(@"Music Library permission is required to load artwork"), nil);
    return ^{};
  }

  NSString *persistentIDString = imageURL.host;
  NSCharacterSet *nonDigits = [[NSCharacterSet decimalDigitCharacterSet] invertedSet];
  if (persistentIDString.length == 0 ||
      imageURL.user != nil ||
      imageURL.password != nil ||
      imageURL.port != nil ||
      imageURL.path.length != 0 ||
      imageURL.query != nil ||
      imageURL.fragment != nil ||
      [persistentIDString rangeOfCharacterFromSet:nonDigits].location != NSNotFound) {
    completionHandler(RCTErrorWithMessage(@"Invalid persistent ID in music artwork URL"), nil);
    return ^{};
  }

  const char *persistentIDUTF8 = persistentIDString.UTF8String;
  if (persistentIDUTF8 == NULL) {
    completionHandler(RCTErrorWithMessage(@"Invalid persistent ID in music artwork URL"), nil);
    return ^{};
  }

  char *endPointer = NULL;
  errno = 0;
  unsigned long long parsedPersistentID = strtoull(persistentIDUTF8, &endPointer, 10);
  if (endPointer == persistentIDUTF8 ||
      *endPointer != '\0' ||
      errno == ERANGE ||
      parsedPersistentID == 0) {
    completionHandler(RCTErrorWithMessage(@"Invalid persistent ID in music artwork URL"), nil);
    return ^{};
  }
  MPMediaEntityPersistentID persistentID = (MPMediaEntityPersistentID)parsedPersistentID;

  MPMediaQuery *query = [MPMediaQuery songsQuery];
  MPMediaPropertyPredicate *predicate =
    [MPMediaPropertyPredicate predicateWithValue:@(persistentID)
                                     forProperty:MPMediaItemPropertyPersistentID];
  [query addFilterPredicate:predicate];

  MPMediaItem *item = query.items.firstObject;
  if (item == nil) {
    completionHandler(RCTErrorWithMessage(@"Music item not found for artwork loading"), nil);
    return ^{};
  }

  MPMediaItemArtwork *artwork = item.artwork;
  if (artwork == nil) {
    completionHandler(RCTErrorWithMessage(@"No artwork is available for this music item"), nil);
    return ^{};
  }

  CGSize targetSize = CGSizeMake(300, 300);
  if (isfinite(size.width) && isfinite(size.height) &&
      size.width > 0 && size.height > 0 &&
      isfinite(scale) && scale > 0) {
    targetSize = CGSizeApplyAffineTransform(size, CGAffineTransformMakeScale(scale, scale));
  }

  UIImage *artworkImage = [artwork imageWithSize:targetSize];
  if (artworkImage == nil) {
    completionHandler(RCTErrorWithMessage(@"Failed to load artwork image"), nil);
    return ^{};
  }

  if (progressHandler != nil) {
    progressHandler(1, 1);
  }
  completionHandler(nil, artworkImage);

  return ^{};
}

@end

#endif
