"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, X, ExternalLink, Loader2 } from 'lucide-react';
import { DigitalCertificate } from '@/types';
import {
  uploadCertificateFile,
  saveCertificateRecord,
  listCertificatesForPet,
} from '@/utils/certificateStorage';

/**
 * Certificate Section (V.0.999) — Import เอกสารจริง + เปิดดูได้
 *
 * Contract: Certificate = Supporting Evidence — เก็บสิ่งที่ผู้ใช้ import เอง
 * ไม่สร้างข้อมูล Domain ใหม่โดยอัตโนมัติ · Persistence ผ่าน digital_certificates
 * + storage bucket 'certificates' (migration 20260928400000)
 */

interface CertificateSectionProps {
  petId: string;
  homeId: string;
  userId: string;
}

const CERT_TYPE_LABELS: Record<string, string> = {
  pedigree: 'ทะเบียนพันธุ์',
  vaccine: 'วัคซีน',
  microchip: 'ไมโครชิป',
  adoption: 'การรับเลี้ยง',
  health: 'สุขภาพ',
  general: 'ทั่วไป',
};

export const CertificateSection: React.FC<CertificateSectionProps> = ({
  petId,
  homeId,
  userId,
}) => {
  const [certs, setCerts] = useState<DigitalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certType, setCertType] = useState<string>('general');
  const [viewing, setViewing] = useState<DigitalCertificate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listCertificatesForPet(petId);
      setCerts(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'โหลดใบรับรองไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const { url } = await uploadCertificateFile({ homeId, petId, file });

      const cert: DigitalCertificate = {
        id: `cert-${Date.now()}`,
        pet_id: petId,
        cert_type: certType as DigitalCertificate['cert_type'],
        title: CERT_TYPE_LABELS[certType] ?? 'ใบรับรอง',
        certificate_no: `DOC-${Date.now()}`,
        issuing_authority: '',
        issue_date: new Date().toISOString().split('T')[0],
        original_doc_url: url,
        security_hash: '',
        verification_qr_payload: '',
        created_at: new Date().toISOString(),
      };

      await saveCertificateRecord(cert, homeId, userId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'นำเข้าเอกสารไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          เอกสารใบรับรอง
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={certType}
            onChange={(e) => setCertType(e.target.value)}
            aria-label="ประเภทเอกสาร"
            className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(CERT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? 'กำลังอัปโหลด...' : 'Import เอกสาร'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      ) : certs.length === 0 ? (
        <p className="text-sm text-gray-400">
          ยังไม่มีเอกสาร — Import เอกสารจริง (รูปถ่าย/PDF) เพื่อเก็บเป็นหลักฐานอ้างอิงของน้อง
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {CERT_TYPE_LABELS[cert.cert_type] ?? cert.cert_type}
                </p>
                <p className="text-xs text-gray-500">
                  {cert.issue_date || ''}{cert.issuing_authority ? ` · ${cert.issuing_authority}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(cert)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                เปิดดู
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Viewer modal — เปิดเอกสารจริง (รูปแสดงในกรอบ, PDF เปิดแท็บใหม่) */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <p className="font-bold text-gray-900">
                  {CERT_TYPE_LABELS[viewing.cert_type] ?? viewing.cert_type}
                </p>
                <p className="text-xs text-gray-500">{viewing.issue_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewing.original_doc_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  เปิดแท็บใหม่
                </a>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  aria-label="ปิด"
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-gray-50 p-4">
              {viewing.original_doc_url.toLowerCase().endsWith('.pdf') ? (
                <p className="p-6 text-center text-sm text-gray-500">
                  เอกสาร PDF — ใช้ปุ่ม &ldquo;เปิดแท็บใหม่&rdquo; เพื่อดูไฟล์เต็ม
                </p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.original_doc_url}
                  alt={viewing.title}
                  className="mx-auto max-h-[70vh] w-auto rounded-lg shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
