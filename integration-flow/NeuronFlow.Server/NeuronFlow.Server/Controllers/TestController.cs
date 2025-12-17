using Microsoft.AspNetCore.Mvc;
using NeuronFlow.Server.Models;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/tests")]
    [ApiController]
    public class TestController : ControllerBase
    {
        [HttpPost("generate")]
        public IActionResult Generate([FromBody] MappingRequest request)
        {
            var scenarios = new[]
            {
                new { Name = "Happy Path", Description = "All fields valid." },
                new { Name = "Missing Field", Description = "Required field missing." },
                new { Name = "Invalid Value", Description = "Invalid format or type." },
                new { Name = "Duplicate Row", Description = "Duplicate data entry." },
                new { Name = "Rate Limit", Description = "Too many requests." },
                new { Name = "Server Error", Description = "Internal error occurs." }
            };

            return Ok(scenarios);
        }

        [HttpPost("run")]
        public IActionResult Run([FromBody] object testConfig)
        {
            var result = new List<TestScenario>
            {
                new TestScenario { Scenario = "Happy Path", Status = "Pass" },
                new TestScenario { Scenario = "Missing Field", Status = "Fail", Details = "Field 'email' is required." },
                new TestScenario { Scenario = "Invalid Value", Status = "Fail", Details = "Field 'age' must be numeric." }
            };

            return Ok(result);
        }
    }
}
