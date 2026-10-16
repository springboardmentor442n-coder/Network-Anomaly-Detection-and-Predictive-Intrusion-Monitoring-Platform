import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, ApiError, api } from '@/lib/api';

/** Install a fake fetch that always returns the given HTTP response. */
function stubFetch(response: { status?: number; body?: unknown; raw?: string }) {
  const status = response.status ?? 200;
  const text = response.raw ?? (response.body === undefined ? '' : JSON.stringify(response.body));
  // 204/304 responses must not carry a body at all.
  const body = status === 204 || status === 304 ? null : text;
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API base URL', () => {
  it('defaults to the Next.js proxy so the browser stays same-origin', () => {
    expect(API_BASE).toBe('/pyapi');
  });
});

describe('request()', () => {
  it('calls the expected endpoint and asks for JSON', async () => {
    const fetchMock = stubFetch({ body: { status: 'ok', version: '1.0.0' } });

    const result = await api.health();

    expect(result).toEqual({ status: 'ok', version: '1.0.0' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/pyapi/api/health');
    expect(init.cache).toBe('no-store');
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it('returns undefined for an empty 204 response', async () => {
    stubFetch({ status: 204 });
    await expect(api.datasets.remove('abc')).resolves.toBeUndefined();
  });

  it('maps the error envelope onto message, code and details', async () => {
    stubFetch({
      status: 400,
      body: {
        detail: {
          error: 'invalid_dataset',
          message: 'Required target columns are missing.',
          details: ["Expected a 'label' column."],
        },
      },
    });

    await expect(api.state()).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'invalid_dataset',
      message: 'Required target columns are missing.',
      details: ["Expected a 'label' column."],
    });
  });

  it('accepts a plain string detail', async () => {
    stubFetch({ status: 404, body: { detail: 'Dataset not found.' } });
    await expect(api.state()).rejects.toMatchObject({ status: 404, message: 'Dataset not found.' });
  });

  it('falls back to a status-based message when the body is unusable', async () => {
    stubFetch({ status: 500, raw: '<<html>>' });
    await expect(api.state()).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });

  it('reports an unreachable backend as a network_error with recovery advice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    const error = (await api.state().catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('network_error');
    expect(error.status).toBe(0);
    expect(error.message).toContain('backend');
    expect(error.details[0]).toBe('fetch failed');
  });
});

describe('download URLs', () => {
  it('drops empty filter values', () => {
    expect(api.datasets.exportUrl('abc', { attack_cat: 'DoS', proto: '', label: undefined })).toBe(
      '/pyapi/api/datasets/abc/export?attack_cat=DoS',
    );
  });

  it('url-encodes filter values', () => {
    expect(api.datasets.exportUrl('abc', { search: 'a b&c' })).toBe(
      '/pyapi/api/datasets/abc/export?search=a+b%26c',
    );
  });

  it('builds the four report URLs with no query when unfiltered', () => {
    expect(api.datasets.reportUrl('abc')).toBe('/pyapi/api/datasets/abc/report');
    expect(api.evaluations.reportUrl('eval1')).toBe('/pyapi/api/evaluations/eval1/report');
    expect(api.detection.reportUrl('det1')).toBe('/pyapi/api/detections/det1/report');
    expect(api.alerts.reportUrl()).toBe('/pyapi/api/alerts/report');
  });

  it('passes alert report filters through', () => {
    expect(api.alerts.reportUrl({ status: 'open', severity: 'critical' })).toBe(
      '/pyapi/api/alerts/report?status=open&severity=critical',
    );
  });
});

describe('multipart requests', () => {
  it('uploads a dataset as FormData without forcing a JSON content type', async () => {
    const fetchMock = stubFetch({ body: { id: 'ds1' } });
    const file = new File(['id,label\n1,0\n'], 'UNSW_NB15_training-set.csv', { type: 'text/csv' });

    await api.datasets.upload(file);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect((init.body as FormData).get('file')).toBe(file);
  });

  it('sends detection parameters as form fields', async () => {
    const fetchMock = stubFetch({ body: { jobId: 'job1', detectionId: 'det1' } });
    const file = new File(['a,b\n1,2\n'], 'traffic.csv', { type: 'text/csv' });

    await api.detection.run({
      file,
      modelId: 'model1',
      mode: 'model',
      critical: 0.9,
      high: 0.75,
      medium: 0.6,
      createAlerts: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/pyapi/api/detect');
    const form = init.body as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('model_id')).toBe('model1');
    expect(form.get('mode')).toBe('model');
    expect(form.get('critical')).toBe('0.9');
    expect(form.get('high')).toBe('0.75');
    expect(form.get('medium')).toBe('0.6');
    expect(form.get('create_alerts')).toBe('true');
  });

  it('defaults the detection mode to model when none is given', async () => {
    const fetchMock = stubFetch({ body: { jobId: 'job1', detectionId: 'det1' } });
    await api.detection.run({ file: new File(['a\n1\n'], 'traffic.csv') });

    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get('mode')).toBe('model');
    expect(form.get('model_id')).toBeNull();
  });
});

describe('JSON bodies', () => {
  it('serialises the training payload', async () => {
    const fetchMock = stubFetch({ body: { jobId: 'job1' } });
    await api.models.train({ datasetId: 'ds1', target: 'label', algorithm: 'random_forest' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/pyapi/api/models/train');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      datasetId: 'ds1',
      target: 'label',
      algorithm: 'random_forest',
    });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends the confirmation flag when deleting alerts', async () => {
    const fetchMock = stubFetch({ body: { deleted: 2, stats: {} } });
    await api.alerts.remove(['a', 'b']);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/pyapi/api/alerts/delete');
    expect(JSON.parse(String(init.body))).toEqual({ ids: ['a', 'b'], confirm: true });
  });
});
