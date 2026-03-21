# Test Fixtures

Place JPEG test images here before running integration tests.

## Required Images

| Filename | Description | Used By |
|----------|-------------|---------|
| foot-overhead-a4.jpg | Foot on A4 paper, overhead shot, dark floor | pipeline tests, SCAN-02 through SCAN-10 |
| foot-45deg-angle.jpg | Foot on A4 paper, ~45° angle — tests perspective correction | SCAN-02, SCAN-04 |
| foot-exif-rotated.jpg | Photo with EXIF orientation 6 (90° CW) — tests EXIF normalization | SCAN-12 |
| foot-white-floor.jpg | Foot on A4 paper, white floor — tests graceful A4_NOT_DETECTED error | SCAN-02, SCAN-05 |

## Generating Fixtures

Take photos with a phone:
1. `foot-overhead-a4.jpg` — stand directly above foot on A4 paper on dark floor
2. `foot-45deg-angle.jpg` — hold phone at ~45° angle above same setup
3. `foot-exif-rotated.jpg` — take photo with phone held sideways (landscape)
4. `foot-white-floor.jpg` — place A4 paper on a white/cream tile floor

Until fixtures exist, tests that require ImageData inputs are marked with `it.skip('fixture missing')`.
