import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Modal, Table, Alert, Row, Col, Accordion } from 'react-bootstrap';

import { csvApi } from '../../services/api';

export default function CsvStep({ step, onChange = () => { }, onValidityChange = () => { }, refreshConnections = () => { }, connections = [] }) {
    const [selectedConnection, setSelectedConnection] = useState(step?.data?.connectionId || null);
    const [showUploadFileModel, setShowUploadFileModel] = useState(false);
    const [file, setFile] = useState(null);
    const [config, setConfig] = useState(step?.data?.csvConfig || { separator: ',', hasHeader: true });
    const [parsed, setParsed] = useState(step?.data?.csvResult?.data || []);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        onValidityChange(Boolean(selectedConnection));
    }, [selectedConnection]);

    useEffect(() => {
        onChange({ ...(step?.data || {}), connectionId: selectedConnection, csvConfig: config, csvResult: { data: parsed } });
    }, [selectedConnection, config, parsed]);

    const handleParse = async () => {
        if (!selectedConnection || !file) return;
        setProcessing(true);
        try {
            const res = await csvApi.uploadAndParse(file, config, selectedConnection);
            setParsed(res.data);
        } catch (err) {
            alert('CSV parse failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    const handleCreate = async () => {
        try {
            const resp = await csvApi.createFromData({ connectionId: selectedConnection, data: parsed });
            onChange({ ...(step?.data || {}), csvCreateResult: resp.data });
            alert('Created successfully');
        } catch (err) {
            alert('Create failed: ' + (err.response?.data?.message || err.message));
        }
    };

    console.log('parsed', parsed);

    return (
        <div>
            <div className="mb-3">
                <Form.Label className="fw-bold small">Choose connection</Form.Label>
                <div>
                    {connections.map(c => {
                        let configJson = c.configJson ? JSON.parse(c.configJson) : {};
                        console.log('configJson', c);
                        return <Card
                            className={`step-card p-3 shadow-sm `}
                        >
                            <label className="list-group-item d-flex " key={c.connectorId} style={{ cursor: 'pointer', display: 'block' }}>

                                <Accordion className='w-100 '>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>
                                            <input type="radio" name={`conn_${step.connectorId}`} className="me-2" checked={String(selectedConnection) === String(c.connectorId)} onChange={() => setSelectedConnection(c.connectorId)} />
                                            <div className='d-greed w-100'>


                                                <strong>{c.name}</strong>
                                                <br />
                                                <div className='w-100 d-flex justify-content-between '>
                                                    <strong>{c.projectName}</strong>
                                                    <span>Details</span>
                                                </div>
                                            </div>
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            <div className='border-bottom'>
                                                <strong>authType:</strong>
                                                <br />
                                                {configJson.authType}
                                            </div>
                                            <div className='border-bottom'>
                                                <strong>connectionType :</strong>
                                                <br />
                                                {configJson.connectionType}
                                            </div>
                                            <div className='border-bottom'>
                                                <strong>Host:</strong>
                                                <br />
                                                {configJson.host}
                                            </div>
                                            <div className='border-bottom'>
                                                <strong>Port:</strong>
                                                <br />
                                                {configJson.port}
                                            </div>
                                            <div className='border-bottom'>
                                                <strong>Username:</strong>
                                                <br />
                                                {configJson.username}
                                            </div>
                                            <div className='border-bottom'>
                                                <strong>Port:</strong>
                                                <br />
                                                {configJson.port}
                                            </div>
                                        </Accordion.Body>
                                    </Accordion.Item>

                                </Accordion>

                            </label>


                        </Card>
                    })}
                </div>
                <div className="mt-2 text-muted"><Button variant="link" onClick={refreshConnections}>Refresh</Button></div>
            </div>

            {selectedConnection &&
                <Button variant="primary" className="w-100" onClick={() => setShowUploadFileModel(true)}>Upload CSV file</Button>}

            <Modal show={showUploadFileModel} onHide={() => setShowUploadFileModel(false)} size="lg" centered backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Upload CSV File</Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ minHeight: '320px' }}>
                    <div className="mb-3">
                        <Form.Label className="fw-bold">CSV File</Form.Label>
                        <Form.Control type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
                    </div>

                    <Row className="mb-3">
                        <Form.Label className="fw-bold ">Separator</Form.Label>
                        <Form.Select className='mx-3 ' value={config.separator} onChange={e => setConfig(prev => ({ ...prev, separator: e.target.value }))}>
                            <option value=",">Comma (,)</option>
                            <option value=";">Semicolon (;)</option>
                            <option value="\t">Tab</option>
                            <option value="|">Pipe (|)</option>
                        </Form.Select>
                    </Row>
                    <Row className="mb-3">
                        <Form.Check className='mx-3  ' type="checkbox" label="Has header row" checked={config.hasHeader} onChange={e => setConfig(prev => ({ ...prev, hasHeader: e.target.checked }))} />
                    </Row>

                    <div className="mb-3">
                        <Button variant="success" className="w-100" disabled={!file || processing} onClick={handleParse}>{processing ? 'Processing...' : 'Parse CSV and Preview'}</Button>
                    </div>

                    {parsed && parsed?.headers?.length > 0 && (

                        <><div style={{ maxHeight: '250px', overflow: 'auto' }} className="mb-3">
                            <Table striped bordered size="sm">
                                <thead>
                                    <tr>{parsed.headers.map((k, i) => <th key={i}>{k}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {parsed.corruptedRows.map((row, i) => (
                                        <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                            {parsed.corruptedRowslength > 0 && (
                                <div>
                                    <Button variant="primary" className="w-100" onClick={handleCreate}>✅ Create from CSV Data</Button>
                                </div>
                            )}
                        </>
                    )}

                </Modal.Body>

            </Modal>
        </div>
    );
}
