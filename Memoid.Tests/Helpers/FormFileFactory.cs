using Microsoft.AspNetCore.Http;

namespace Memoid.Tests.Helpers;

public static class FormFileFactory
{
    public static IFormFile Create(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }
}
