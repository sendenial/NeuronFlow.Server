using FluentFTP;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuronFlow.Application.DTOs;
using NeuronFlow.Application.DTOs.Connection;
using NeuronFlow.Domain.Entities;
using NeuronFlow.Infrastructure.Persistence;
using Newtonsoft.Json.Linq;
using Renci.SshNet;
using Renci.SshNet.Common;
using System.Net.Sockets;
using System.Security.Claims;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/connections")]
    [ApiController]
    [Authorize]
    public class ConnectionsController : ControllerBase
    {
        private readonly NeuronFlowDbContext _context;

        public ConnectionsController(NeuronFlowDbContext context)
        {
            _context = context;
        }

        // GET: api/connections?projectId={guid}
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ConnectionResponseDto>>> GetConnections([FromQuery] Guid? projectId)
        {
            var query = _context.Connections.AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(c => c.ProjectId == projectId.Value);
            }

            var connections = await query
                .Where(c => !c.IsDelete)
                .OrderByDescending(c => c.CreatedDate)
                .Select(c => new ConnectionResponseDto
                {
                    ConnectorId = c.ConnectorId,
                    Name = c.Name,
                    ConnectorType = c.ConnectorType,
                    ConfigJson = c.ConfigJson,
                    ProjectId = c.ProjectId,
                    ProjectName = c.Project != null ? c.Project.ProjectName : null,

                    // Audit Fields
                    CreatedBy = c.CreatedBy,
                    CreatedDate = c.CreatedDate,
                    CreatedByName = _context.Users
                        .Where(u => u.Id == c.CreatedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? null,

                    ModifiedBy = c.ModifiedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == c.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? null
                })
                .ToListAsync();

            return Ok(connections);
        }

        // GET: api/connections/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ConnectionResponseDto>> GetConnection(Guid id)
        {
            var connection = await _context.Connections
                .Where(c => c.ConnectorId == id && !c.IsDelete)
                .Select(c => new ConnectionResponseDto
                {
                    ConnectorId = c.ConnectorId,
                    Name = c.Name,
                    ConnectorType = c.ConnectorType,
                    ConfigJson = c.ConfigJson,
                    ProjectId = c.ProjectId,
                    ProjectName = c.Project != null ? c.Project.ProjectName : null,

                    CreatedBy = c.CreatedBy,
                    CreatedDate = c.CreatedDate,
                    CreatedByName = _context.Users
                        .Where(u => u.Id == c.CreatedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? null,

                    ModifiedBy = c.ModifiedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == c.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? null
                })
                .FirstOrDefaultAsync();

            if (connection == null) return NotFound();

            return Ok(connection);
        }

        // POST: api/connections
        [HttpPost]
        public async Task<ActionResult<Connection>> CreateConnection(CreateConnectionDto request)
        {
            // Verify Project exists
            var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == request.ProjectId && !p.IsDelete);
            if (!projectExists) return BadRequest("Invalid Project ID.");

            var userId = GetUserId();

            var connection = new Connection
            {
                ProjectId = request.ProjectId,
                Name = request.Name,
                ConnectorType = request.ConnectorType,
                ConfigJson = request.ConfigJson,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                IsDelete = false
            };

            _context.Connections.Add(connection);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetConnection), new { id = connection.ConnectorId }, connection);
        }

        // PUT: api/connections/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateConnection(Guid id, UpdateConnectionDto request)
        {
            var connection = await _context.Connections.FindAsync(id);
            if (connection == null || connection.IsDelete) return NotFound();

            var userId = GetUserId();

            connection.Name = request.Name;
            connection.ConnectorType = request.ConnectorType;
            connection.ConfigJson = request.ConfigJson;
            connection.ModifiedBy = userId;
            connection.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/connections/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConnection(Guid id)
        {
            var connection = await _context.Connections.FindAsync(id);
            if (connection == null || connection.IsDelete) return NotFound();

            var userId = GetUserId();

            // Soft Delete
            connection.IsDelete = true;
            connection.ModifiedBy = userId;
            connection.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst("uid")?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestConnection([FromBody] CreateConnectionDto request)
        {
            try
            {
                var config = Newtonsoft.Json.Linq.JObject.Parse(request.ConfigJson);

                // --- 1. HTTP / REST API TEST (ID = 1) ---
                if ((int)request.ConnectorType == 1)
                {
                    string baseUrl = config["baseUrl"]?.ToString();
                    string authType = config["authType"]?.ToString(); // "None", "Basic", "Header Auth"

                    if (string.IsNullOrEmpty(baseUrl))
                        return BadRequest(new { message = "Base URL is required." });

                    // Validate URL format
                    if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out Uri validUri))
                        return BadRequest(new { message = "Invalid Base URL format." });

                    using (var client = new HttpClient())
                    {
                        client.Timeout = TimeSpan.FromSeconds(10); // 10s Timeout

                        // A. Configure Authentication
                        if (authType == "Basic")
                        {
                            string u = config["username"]?.ToString();
                            string p = config["password"]?.ToString();
                            if (string.IsNullOrEmpty(u) || string.IsNullOrEmpty(p))
                                return BadRequest(new { message = "Username and Password required for Basic Auth." });

                            var byteArray = System.Text.Encoding.ASCII.GetBytes($"{u}:{p}");
                            client.DefaultRequestHeaders.Authorization =
                                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));
                        }
                        else if (authType == "Bearer")
                        {
                            string token = config["bearerToken"]?.ToString();
                            if (string.IsNullOrEmpty(token))
                                return BadRequest(new { message = "Token is required." });

                            client.DefaultRequestHeaders.Authorization =
                                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        }
                        else if (authType == "Header Auth")
                        {
                            string hName = config["headerName"]?.ToString();
                            string hVal = config["headerValue"]?.ToString();
                            if (!string.IsNullOrEmpty(hName) && !string.IsNullOrEmpty(hVal))
                            {
                                client.DefaultRequestHeaders.Add(hName, hVal);
                            }
                        }

                        // B. Send Request (Try to reach the server)
                        try
                        {
                            // We use GET. Some APIs might prefer HEAD, but GET is safer for generic testing.
                            var response = await client.GetAsync(validUri);

                            // C. Analyze Response
                            if (response.IsSuccessStatusCode)
                            {
                                return Ok(new { message = "Connection successful! (200 OK)" });
                            }
                            else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                            {
                                return BadRequest(new { message = "Authentication Failed: 401 Unauthorized. Check credentials." });
                            }
                            else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                            {
                                return BadRequest(new { message = "Access Denied: 403 Forbidden. Check permissions." });
                            }
                            else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                            {
                                // 404 means we REACHED the server, but the specific path is empty. 
                                // For a generic "Connection Test", this is usually a SUCCESS (network-wise).
                                return Ok(new { message = "Connected to Server (but endpoint returned 404). Network path is valid." });
                            }
                            else
                            {
                                return BadRequest(new { message = $"Server reachable but returned error: {response.StatusCode}" });
                            }
                        }
                        catch (HttpRequestException ex)
                        {
                            return BadRequest(new { message = $"Network Error: Unable to reach {baseUrl}. ({ex.Message})" });
                        }
                        catch (TaskCanceledException)
                        {
                            return BadRequest(new { message = "Connection timed out. Server is not responding." });
                        }
                    }
                }

                // --- 2. FTP / SFTP TEST (ID = 2) ---
                else if ((int)request.ConnectorType == 2)
                {
                    string host = config["host"]?.ToString();
                    string username = config["username"]?.ToString();
                    string password = config["password"]?.ToString();
                    int port = config["port"] != null ? int.Parse(config["port"].ToString()) : 22;

                    if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                    {
                        return BadRequest(new { message = "Host, Username, and Password are required." });
                    }

                    // SFTP Check
                    if (port == 22 || config["protocol"]?.ToString() == "SFTP")
                    {
                        var connectionInfo = new PasswordConnectionInfo(host, port, username, password)
                        {
                            Timeout = TimeSpan.FromSeconds(5)
                        };

                        using (var client = new SftpClient(connectionInfo))
                        {
                            try
                            {
                                client.Connect();
                                client.Disconnect();
                                return Ok(new { message = "SFTP Connection successful!" });
                            }
                            catch (System.Net.Sockets.SocketException)
                            {
                                return BadRequest(new { message = $"Network Error: Unable to reach host '{host}'." });
                            }
                            catch (Renci.SshNet.Common.SshAuthenticationException)
                            {
                                return BadRequest(new { message = "SFTP Authentication failed. Wrong credentials." });
                            }
                            catch (Exception ex)
                            {
                                return BadRequest(new { message = $"SFTP Error: {ex.Message}" });
                            }
                        }
                    }
                    // FTP Check
                    else
                    {
                        using (var client = new FluentFTP.FtpClient(host, username, password, port))
                        {
                            //client.ConnectTimeout = 5000;
                            try
                            {
                                client.Connect();
                                client.Disconnect();
                                return Ok(new { message = "FTP Connection successful!" });
                            }
                            catch (FluentFTP.Exceptions.FtpAuthenticationException)
                            {
                                return BadRequest(new { message = "FTP Authentication failed." });
                            }
                            catch (Exception ex)
                            {
                                return BadRequest(new { message = $"FTP Error: {ex.Message}" });
                            }
                        }
                    }
                }

                return BadRequest(new { message = "Unknown Connector Type." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"System Error: {ex.Message}" });
            }
        }
    }
}