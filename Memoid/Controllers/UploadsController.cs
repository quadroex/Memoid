using Memoid.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace Memoid.Controllers;

/// <summary>
/// API для безпечного завантаження у wwwroot/uploads.
/// </summary>
[ApiController]
[Tags("Uploads")]
[Route("api/uploads")]
public class UploadsController : ControllerBase
{
    private const long MaxFileSize = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly IWebHostEnvironment _environment;

    public UploadsController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    /// <summary>
    /// Завантажує шаблон мема.
    /// </summary>
    /// <param name="file">Файл JPG, PNG або WEBP розміром до 5 МБ.</param>
    /// <returns>Метадані файлу та шлях.</returns>
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadedFileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [HttpPost("templates")]
    public Task<ActionResult<UploadedFileDto>> UploadTemplateImage(IFormFile? file)
    {
        return UploadToFolderAsync(file, "templates");
    }

    /// <summary>
    /// Завантажує зображення користувача.
    /// </summary>
    /// <param name="file">Файл JPG, PNG або WEBP розміром до 5 МБ.</param>
    /// <returns>Метадані файлу та шлях.</returns>
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadedFileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [HttpPost("custom")]
    public Task<ActionResult<UploadedFileDto>> UploadCustomImage(IFormFile? file)
    {
        return UploadToFolderAsync(file, "custom");
    }

    /// <summary>
    /// Завантажує зображення створеного мема.
    /// </summary>
    /// <param name="file">Файл JPG, PNG або WEBP розміром до 5 МБ.</param>
    /// <returns>Метадані файлу та шлях.</returns>
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadedFileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [HttpPost("generated")]
    public Task<ActionResult<UploadedFileDto>> UploadGeneratedImage(IFormFile? file)
    {
        return UploadToFolderAsync(file, "generated");
    }

    private async Task<ActionResult<UploadedFileDto>> UploadToFolderAsync(IFormFile? file, string folderName)
    {
        var validationError = ValidateFile(file);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Не вдалося знайти папку wwwroot.");
        }

        var extension = GetSafeExtension(file!);
        var generatedFileName = $"{Guid.NewGuid():N}{extension}";
        var uploadFolder = EnsureUploadFolder(webRootPath, folderName);
        var physicalPath = Path.Combine(uploadFolder, generatedFileName);

        try
        {
            await using var stream = new FileStream(physicalPath, FileMode.CreateNew);
            await file!.CopyToAsync(stream);
        }
        catch (IOException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Не вдалося зберегти файл.");
        }

        var relativePath = $"/uploads/{folderName}/{generatedFileName}";
        var dto = new UploadedFileDto
        {
            FileName = generatedFileName,
            RelativePath = relativePath,
            ContentType = file.ContentType,
            Size = file.Length
        };

        return Created(relativePath, dto);
    }

    private static string? ValidateFile(IFormFile? file)
    {
        if (file is null)
        {
            return "Файл не було передано.";
        }

        if (file.Length == 0)
        {
            return "Файл порожній.";
        }

        if (file.Length > MaxFileSize)
        {
            return "Розмір файлу перевищує дозволені 5 МБ.";
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            return "Непідтримуваний тип файлу. Дозволені формати: JPG, PNG, WEBP.";
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedContentTypes.Contains(file.ContentType))
        {
            return "Непідтримуваний тип файлу. Дозволені формати: JPG, PNG, WEBP.";
        }

        return null;
    }

    private static string GetSafeExtension(IFormFile file)
    {
        return Path.GetExtension(file.FileName).ToLowerInvariant();
    }

    private static string EnsureUploadFolder(string webRootPath, string folderName)
    {
        var uploadFolder = Path.Combine(webRootPath, "uploads", folderName);
        Directory.CreateDirectory(uploadFolder);
        return uploadFolder;
    }
}
