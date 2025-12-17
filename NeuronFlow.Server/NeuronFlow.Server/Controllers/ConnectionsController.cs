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
                        .FirstOrDefault() ?? "Unknown",

                    ModifiedBy = c.ModifiedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == c.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown"
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
                        .FirstOrDefault() ?? "Unknown",

                    ModifiedBy = c.ModifiedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == c.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown"
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
        public IActionResult TestConnection([FromBody] CreateConnectionDto request)
        {
            try
            {
                var config = JObject.Parse(request.ConfigJson);
                string host = config["host"]?.ToString();
                string username = config["username"]?.ToString();
                string password = config["password"]?.ToString();
                int port = config["port"] != null ? int.Parse(config["port"].ToString()) : 22;

                if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                {
                    return BadRequest("Host, Username, and Password are required.");
                }

                // Logic for FTP / SFTP (ID = 2)
                if (request.ConnectorType == Application.Enums.ConnectionType.Ftp) // Assuming ID 2 is FTP in your Enum
                {
                    // Try SFTP (Default usually)
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
                            }
                            catch (SocketException)
                            {
                                return BadRequest(new { message = $"Network Error: Unable to reach host '{host}' on port {port}. Check your firewall or IP." });
                            }
                            catch (SshOperationTimeoutException)
                            {
                                return BadRequest(new { message = "Connection Timed Out. The server is not responding." });
                            }
                            catch (SshAuthenticationException)
                            {
                                return BadRequest(new { message = "Authentication failed. Wrong username or password." });
                            }
                            catch (Exception ex)
                            {
                                return BadRequest(new { message = $"SFTP Error: {ex.Message}" });
                            }
                        }
                    }
                    // Try FTP
                    else
                    {
                        using (var client = new FtpClient(host, username, password, port))
                        {
                            // Set timeout
                            //client.ConnectTimeout = 5000;

                            try
                            {
                                client.Connect();
                                client.Disconnect();
                            }
                            catch (IOException ex)
                            {
                                // THIS CATCHES YOUR SPECIFIC ERROR
                                return BadRequest(new { message = $"Network Error: The server '{host}' did not respond. (Firewall or wrong IP?)" });
                            }
                            catch (SocketException)
                            {
                                return BadRequest(new { message = "Unable to connect. Check Host/Port." });
                            }
                            catch (FluentFTP.Exceptions.FtpAuthenticationException)
                            {
                                return BadRequest(new { message = "FTP Authentication failed." });
                            }
                        }
                    }
                }
                // Add logic for SQL (ID = 0) or HTTP (ID = 1) here if needed...

                return Ok(new { message = "Connection successful!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Connection failed: {ex.Message}");
            }
        }
    }
}