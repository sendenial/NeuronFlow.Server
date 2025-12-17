using Microsoft.AspNetCore.Mvc;
using NeuronFlow.Server.Models;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/mapping")]
    [ApiController]
    public class MappingController : ControllerBase
    {
        [HttpPost("suggest")]
        public IActionResult Suggest([FromBody] MappingRequest request)
        {
            var suggestions = request.Headers
                .Select(h => new {
                    Header = h,
                    SuggestedField = request.ApiFields.FirstOrDefault(f => f.Contains(h, StringComparison.OrdinalIgnoreCase)) ?? "No match"
                })
                .ToList();

            return Ok(suggestions);
        }
    }
}
