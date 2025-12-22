import React, { useEffect } from 'react';
import { Form } from 'react-bootstrap';

export default function TriggerConfig({ step, onChange = () => {}, onValidityChange = () => {} }) {
    const data = step?.data || {};

    useEffect(() => {
        const valid = Boolean(data && data.interval > 0 && data.unit);
        onValidityChange(valid);
    }, [data.interval, data.unit]);

    return (
        <div>
            <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Trigger every <span className="text-danger">*</span></Form.Label>
                <Form.Control
                    type="number"
                    min={1}
                    value={data.interval || ''}
                    onChange={e => onChange({ ...data, interval: parseInt(e.target.value || 0) })}
                    placeholder="Number"
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Time unit <span className="text-danger">*</span></Form.Label>
                <Form.Select
                    value={data.unit || ''}
                    onChange={e => onChange({ ...data, unit: e.target.value })}
                >
                    <option value="">Choose unit</option>
                    <option value="minute">Minute(s)</option>
                    <option value="hour">Hour(s)</option>
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                </Form.Select>
            </Form.Group>

            <div className="mt-2"><small className="text-muted">Both fields are required for scheduled triggers.</small></div>
        </div>
    );
}
