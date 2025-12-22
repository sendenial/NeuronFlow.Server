import React, { useEffect } from 'react';
import { Form } from 'react-bootstrap';

export default function HttpStep({ step, onChange = () => {}, onValidityChange = () => {} }) {
    const data = step?.data || {};

    useEffect(() => {
        const valid = Boolean(data && data.url);
        onValidityChange(valid);
    }, [data.url]);

    return (
        <div>
            <Form.Group className="mb-3">
                <Form.Label className="fw-bold">URL <span className="text-danger">*</span></Form.Label>
                <Form.Control value={data.url || ''} onChange={e => onChange({ ...data, url: e.target.value })} placeholder="https://api.example.com/endpoint" />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Method</Form.Label>
                <Form.Select value={data.method || 'GET'} onChange={e => onChange({ ...data, method: e.target.value })}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </Form.Select>
            </Form.Group>
        </div>
    );
}
