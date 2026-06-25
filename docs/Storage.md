# Storage & Upload Engine (DigitalOcean Spaces)

## Purpose

Storage is now media-oriented rather than video-only.

- It supports images, videos, audio, temporary uploads, reference images, mask images, and output collections.
- It stores metadata in `FileAsset`.
- It validates assets before generation services accept them.

## Storage Flow

1. A client uploads media through server upload endpoints or direct signed URLs.
2. The storage layer validates folder, MIME type, extension, and size.
3. A UUID-based storage key is generated.
4. The provider uploads to DigitalOcean Spaces.
5. A `FileAsset` record stores metadata such as owner, MIME type, file type, dimensions, duration, and checksum.
6. Generation services later validate referenced media against configured Spaces or CDN rules.

## Supported Asset Categories

The storage design now supports:

- profile images
- template preview images
- template preview videos
- generated images
- generated videos
- generated audio
- temporary assets
- reference images
- mask images
- output collections and future batch artifacts

## Folder Strategy

Allowed folders are validated server-side:

- `users/`, `users/profile/`, `users/temp/`
- `templates/`, `templates/images/`, `templates/videos/`
- `generation/`, `generation/input/`, `generation/output/`, `generation/thumbnails/`
- `admin/`, `admin/banner/`, `admin/assets/`
- `system/`, `logs/`, `temporary/`

This folder policy supports both the old video flows and the new generic media flows without changing route structure.

## Upload Flow (Server Upload)

1. Client sends multipart data with a `file`.
2. The upload service validates auth, folder policy, type, and size.
3. Images are processed through Sharp when appropriate.
4. The storage service uploads the final binary to Spaces.
5. A `FileAsset` record is created and returned through the controller.

Controllers never upload directly.

## Signed URL Flow

1. Client requests a signed URL through `GET /api/v1/upload/signed-url`.
2. The server validates operation, folder, MIME type, and file type.
3. The server returns a signed upload or download URL plus a generated storage key.
4. Client uploads directly to Spaces.
5. The resulting asset can later be attached to generation or profile flows.

## Generation Asset Validation

The generation layer validates referenced media using storage-aware rules:

- images
- videos
- audio
- reference images
- mask images

Checks include:

- HTTPS URL validation
- Spaces or approved CDN origin validation in production
- extension-to-MIME consistency
- size limits
- required `storageKey` in production

## Temporary Asset Lifecycle

- Temporary uploads are marked `Temporary`.
- Cleanup reads retention rules from `AppSetting` `STORAGE`.
- Expired temporary assets are deleted from Spaces and then marked deleted in MongoDB.

## Security Rules

- authenticated uploads only
- ownership checks on deletes and signed downloads
- blocked executable extensions
- no storage credentials returned to clients
- admin/system folder restrictions on signed URL generation

## Future Expansion

The storage layer is ready for:

- transcoding
- FFmpeg workflows
- virus scanning
- CDN invalidation
- output zips and batch exports
- community asset moderation
