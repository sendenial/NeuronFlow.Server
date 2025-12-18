export const CONNECTOR_CATALOG = [
  { id: 0, name: 'SQL Server', category: 'Database', icon: '🛢️', color: '#e3f2fd', description: 'Connect to on-prem or cloud SQL databases.' },
  { id: 1, name: 'REST API', category: 'HTTP', icon: '🌐', color: '#e8f5e9', description: 'Call any external HTTP/REST endpoint.' },
  { id: 2, name: 'FTP / SFTP', category: 'File', icon: '📂', color: '#fff3e0', description: 'Transfer files via FTP or SFTP protocols.' }, // This one
];

export const CONNECTOR_TYPES = {
  0: 'SQL Server',
  1: 'REST API',
  2: 'FTP / SFTP'
};

export const CONNECTOR_SCHEMAS = {
  // 0: SQL Server (Keep existing)
  0: [
    { key: 'host', label: 'Host', type: 'text', required: true },
    { key: 'port', label: 'Port', type: 'number', defaultValue: '1433' },
    { key: 'database', label: 'Database', type: 'text', required: true },
    { key: 'username', label: 'Username', type: 'text', required: true },
    { key: 'password', label: 'Password', type: 'password', required: true }
  ],

  // 1: REST API (Keep existing)
  1: [
    {
      key: 'connectionType',
      label: 'Connection type',
      type: 'select',
      options: ['Cloud', 'On-premise'],
      defaultValue: 'Cloud',
      helpText: 'If you want to connect using an on-prem group, please choose one from the dropdown.'
    },
    {
      key: 'authType',
      label: 'Authentication type',
      type: 'select',
      options: ['None', 'Basic', 'Header Auth', 'Bearer'],
      defaultValue: 'None',
      required: true,
      helpText: 'Select an authentication method.'
    },

    // --- BASIC AUTH FIELDS (Only visible if authType == Basic) ---
    {
      key: 'username',
      label: 'Basic auth user',
      type: 'text',
      // This field only shows if authType is 'Basic'
      dependency: { field: 'authType', value: 'Basic' }
    },
    {
      key: 'password',
      label: 'Basic auth password',
      type: 'password',
      dependency: { field: 'authType', value: 'Basic' }
    },

    // --- HEADER AUTH FIELDS (Only visible if authType == Header Auth) ---
    {
      key: 'headerName',
      label: 'Header name',
      type: 'text',
      dependency: { field: 'authType', value: 'Header Auth' }
    },
    {
      key: 'headerValue',
      label: 'Header value',
      type: 'password',
      dependency: { field: 'authType', value: 'Header Auth' }
    },

    // 2. Add this new field block to the HTTP schema (ID: 1)
    {
      key: 'bearerToken',
      label: 'Token',
      type: 'password',
      dependency: { field: 'authType', value: 'Bearer' },
      helpText: 'Enter the JWT token. The "Bearer" prefix will be added automatically.'
    },

    // --- COMMON FIELDS ---
    {
      key: 'caseSensitive',
      label: 'Endpoint has case-sensitive headers?',
      type: 'select',
      options: ['Yes', 'No'],
      defaultValue: 'No',
      helpText: 'When disabled, system will convert the header names to sentence case. Defaults to No.'
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'text',
      placeholder: 'https://api.example.com/v1/',
      helpText: 'Set the Base URL for all requests. If set, it cannot be overridden by recipes.'
    },
    {
      key: 'useTls',
      label: 'Use custom TLS/SSL certificate settings',
      type: 'select',
      options: ['Yes', 'No'],
      defaultValue: 'No',
      helpText: 'NOTE: If using custom certificate/key settings below, please use PEM format.'
    },
    // TLS Fields (Only visible if useTls == Yes)
    {
      key: 'tlsCert',
      label: 'Certificate (PEM)',
      type: 'textarea',
      dependency: { field: 'useTls', value: 'Yes' }
    }
  ],

  // 2: FTP / SFTP (UPDATED TO MATCH SCREENSHOT)
  2: [
    {
      key: 'connectionType',
      label: 'Connection type',
      type: 'select',
      options: ['Cloud', 'On-premise'],
      defaultValue: 'Cloud',
      helpText: 'If you want to connect using an on-prem group, please choose one from the dropdown.'
    },
    {
      key: 'authType',
      label: 'Authentication type',
      type: 'select',
      options: ['Username/password', 'Public Key'],
      defaultValue: 'Username/password',
      required: true
    },
    {
      key: 'username',
      label: 'Username',
      type: 'text',
      required: true
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true
    },
    {
      key: 'host',
      label: 'Host',
      type: 'text',
      required: true,
      placeholder: 'e.g. sftp.example.com',
      helpText: 'Contact your SFTP server administrator to whitelist system IP addresses.'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      defaultValue: '22',
      helpText: 'The standard port is 22. Contact your SFTP server administrator for the correct port.'
    },
    {
      key: 'fingerprint',
      label: 'Host key fingerprint',
      type: 'text',
      helpText: 'The connection will still be encrypted without this, but without protection against MITM attacks. Format: MD5 or SHA256.'
    },
    {
      key: 'bufferSize',
      label: 'Transfer buffer size',
      type: 'number',
      defaultValue: '32768',
      helpText: 'Size of the buffer used to transfer files. Default and minimum is 32768. Larger sizes generally speed up transfers.'
    },
    {
      key: 'forceClose',
      label: 'Force close?',
      type: 'select',
      options: ['Yes', 'No'],
      defaultValue: 'No',
      helpText: 'Shuts down the underlying SSH connection at the end of the transaction. Only needed for servers that hang.'
    },
    {
      key: 'explicitVersion',
      label: 'Explicit version',
      type: 'text',
      helpText: 'Set SFTP protocol version to use (e.g. 3, 4, 5, 6).'
    },
    {
      key: 'appendSupported',
      label: 'Append operations supported?',
      type: 'select',
      options: ['Yes', 'No'],
      defaultValue: 'Yes',
      helpText: 'Select No if your SFTP provider does not support append/modify operations. Defaults to Yes.'
    }
  ]
};