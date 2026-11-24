using System.Security.Cryptography;
using System.Text;

namespace HabitsTracker.Api.Services;

/// <summary>
/// Requires an <c>X-Api-Key</c> header on <c>/api</c> requests when the <c>ApiKey</c> setting is set.
/// With no key configured (local development) every request is allowed.
/// </summary>
/// <remarks>
/// The mobile app ships with the key, so this keeps out casual traffic to a public URL;
/// it is not per-user authentication.
/// </remarks>
public class ApiKeyMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public const string HeaderName = "X-Api-Key";

    private readonly byte[]? _expected = configuration["ApiKey"] is { Length: > 0 } key
        ? Encoding.UTF8.GetBytes(key)
        : null;

    public async Task InvokeAsync(HttpContext context)
    {
        if (_expected is not null && context.Request.Path.StartsWithSegments("/api"))
        {
            var provided = context.Request.Headers[HeaderName].ToString();
            if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(provided), _expected))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
        }

        await next(context);
    }
}
