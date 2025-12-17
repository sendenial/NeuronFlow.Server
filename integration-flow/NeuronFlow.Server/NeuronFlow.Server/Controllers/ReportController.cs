using Microsoft.AspNetCore.Mvc;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/report")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        [HttpPost("export")]
        public IActionResult Export([FromBody] object testResults)
        {
            // Convert to JSON or HTML report (simplified here)
            string report = $"<html><body><h1>Test Report</h1><pre>{testResults}</pre></body></html>";
            return File(System.Text.Encoding.UTF8.GetBytes(report), "application/pdf", "report.html");
        }
    }
}
