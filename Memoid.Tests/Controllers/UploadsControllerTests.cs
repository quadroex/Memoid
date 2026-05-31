using FluentAssertions;
using Memoid.Controllers;
using Memoid.DTOs;
using Memoid.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace Memoid.Tests.Controllers;

public class UploadsControllerTests
{
    private static readonly byte[] PngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01];
    private static readonly byte[] JpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x01];
    private static readonly byte[] WebpBytes = [0x52, 0x49, 0x46, 0x46, 0x01, 0x57, 0x45, 0x42, 0x50];

    [Fact]
    public async Task UploadTemplateImage_ValidPng_SavesFileAndReturnsDto()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("test.png", "image/png", PngBytes);

            var result = await controller.UploadTemplateImage(file);

            var created = result.Result.Should().BeOfType<CreatedResult>().Which;
            var dto = created.Value.Should().BeOfType<UploadedFileDto>().Which;
            dto.RelativePath.Should().StartWith("/uploads/templates/");
            File.Exists(ToPhysicalPath(webRootPath, dto.RelativePath)).Should().BeTrue();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task UploadCustomImage_ValidJpeg_SavesToCustomFolder()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("test.jpg", "image/jpeg", JpegBytes);

            var result = await controller.UploadCustomImage(file);

            var created = result.Result.Should().BeOfType<CreatedResult>().Which;
            var dto = created.Value.Should().BeOfType<UploadedFileDto>().Which;
            dto.RelativePath.Should().StartWith("/uploads/custom/");
            File.Exists(ToPhysicalPath(webRootPath, dto.RelativePath)).Should().BeTrue();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task UploadGeneratedImage_ValidWebp_SavesToGeneratedFolder()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("test.webp", "image/webp", WebpBytes);

            var result = await controller.UploadGeneratedImage(file);

            var created = result.Result.Should().BeOfType<CreatedResult>().Which;
            var dto = created.Value.Should().BeOfType<UploadedFileDto>().Which;
            dto.RelativePath.Should().StartWith("/uploads/generated/");
            File.Exists(ToPhysicalPath(webRootPath, dto.RelativePath)).Should().BeTrue();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task Upload_NullFile_ReturnsBadRequest()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);

            var result = await controller.UploadTemplateImage(null);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task Upload_EmptyFile_ReturnsBadRequest()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("empty.png", "image/png", []);

            var result = await controller.UploadTemplateImage(file);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task Upload_InvalidExtension_ReturnsBadRequest()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("test.txt", "text/plain", PngBytes);

            var result = await controller.UploadTemplateImage(file);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    [Fact]
    public async Task Upload_InvalidContentType_ReturnsBadRequest()
    {
        var webRootPath = CreateTemporaryWebRoot();
        using var environment = new FakeWebHostEnvironment(webRootPath);

        try
        {
            var controller = new UploadsController(environment);
            var file = FormFileFactory.Create("test.png", "text/plain", PngBytes);

            var result = await controller.UploadTemplateImage(file);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
        finally
        {
            DeleteDirectory(webRootPath);
        }
    }

    private static string CreateTemporaryWebRoot()
    {
        var path = Path.Combine(Path.GetTempPath(), "Memoid.Tests", Guid.NewGuid().ToString("N"), "wwwroot");
        Directory.CreateDirectory(path);
        return path;
    }

    private static string ToPhysicalPath(string webRootPath, string relativePath)
    {
        var path = relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(webRootPath, path);
    }

    private static void DeleteDirectory(string path)
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "Memoid.Tests"));
        var target = Path.GetFullPath(path);

        if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var directory = Directory.GetParent(target)?.Parent?.FullName ?? target;
        if (Directory.Exists(directory))
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
