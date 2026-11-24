namespace HabitsTracker.Api.Endpoints;

internal static class Validation
{
    public static IResult Problem(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
