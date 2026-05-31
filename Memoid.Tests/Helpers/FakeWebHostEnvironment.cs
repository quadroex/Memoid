using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace Memoid.Tests.Helpers;

public sealed class FakeWebHostEnvironment : IWebHostEnvironment, IDisposable
{
    public FakeWebHostEnvironment(string webRootPath)
    {
        WebRootPath = webRootPath;
        ContentRootPath = webRootPath;
        WebRootFileProvider = new PhysicalFileProvider(webRootPath);
        ContentRootFileProvider = new PhysicalFileProvider(webRootPath);
    }

    public string ApplicationName { get; set; } = "Memoid.Tests";

    public IFileProvider WebRootFileProvider { get; set; }

    public string WebRootPath { get; set; }

    public string EnvironmentName { get; set; } = "Development";

    public string ContentRootPath { get; set; }

    public IFileProvider ContentRootFileProvider { get; set; }

    public void Dispose()
    {
        (WebRootFileProvider as IDisposable)?.Dispose();
        (ContentRootFileProvider as IDisposable)?.Dispose();
    }
}
