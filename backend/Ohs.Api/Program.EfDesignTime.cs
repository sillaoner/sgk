using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Ohs.Api;

public partial class Program
{
    // Allows EF tooling to resolve a host without executing the web app entrypoint.
    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureServices(services =>
            {
                _ = services;
            });
}
