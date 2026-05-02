using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ohs.Api.Data;

namespace Ohs.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize(Roles = "supervisor,ohs,manager")]
public sealed class UploadsController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png"
    };

    private const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private readonly IWebHostEnvironment _environment;
    private readonly OhsDbContext _db;

    public UploadsController(IWebHostEnvironment environment, OhsDbContext db)
    {
        _environment = environment;
        _db = db;
    }

    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UploadImagesResponse>> UploadImages(
        [FromForm] IFormFileCollection files,
        CancellationToken cancellationToken)
    {
        _ = await this.BuildValidatedUserContextAsync(_db, cancellationToken);

        var incomingFiles = files;
        if ((incomingFiles is null || incomingFiles.Count == 0) && Request.HasFormContentType)
        {
            incomingFiles = (await Request.ReadFormAsync(cancellationToken)).Files;
        }

        if (incomingFiles is null || incomingFiles.Count == 0)
        {
            return BadRequest(new { error = "At least one image file is required." });
        }

        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        var targetDirectory = Path.Combine(webRoot, "uploads", "images");
        Directory.CreateDirectory(targetDirectory);

        var urls = new List<string>(incomingFiles.Count);

        foreach (var file in incomingFiles)
        {
            if (file.Length <= 0)
            {
                continue;
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { error = $"File '{file.FileName}' exceeds 5MB limit." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(new { error = $"File '{file.FileName}' is not a supported image type." });
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                return BadRequest(new { error = $"File '{file.FileName}' has an invalid content type." });
            }

            var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(targetDirectory, uniqueFileName);

            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream, cancellationToken);

            var publicUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/uploads/images/{uniqueFileName}";
            urls.Add(publicUrl);
        }

        if (urls.Count == 0)
        {
            return BadRequest(new { error = "No valid image files were uploaded." });
        }

        return Ok(new UploadImagesResponse(urls));
    }
}

public sealed record UploadImagesResponse(IReadOnlyCollection<string> Urls);
