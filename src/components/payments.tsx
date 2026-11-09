"use client";
import { useRef, useState, type FormEvent } from "react";
import { Plus, Download, Wallet } from "lucide-react";
import {
  can,
  commandSchema,
  csv,
  numericDraft,
  requiredNumber,
  userError,
  type Payment,
} from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Notice, Badge, Empty, money, date, download } from "./shared";
import s from "@/lib/ui";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function PaymentForm({ close }: { close: () => void }) {
  const { data, execute, busy } = useStore();
  const [partner, setPartner] = useState(""),
    [amount, setAmount] = useState(""),
    [paid_on, setDate] = useState(today),
    [method, setMethod] = useState("efectivo"),
    [reference, setReference] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  const request = useRef<string | null>(null);
  if (!data) return null;
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      request.current ??= crypto.randomUUID();
      await execute(
        commandSchema.parse({
          type: "payment",
          request_id: request.current,
          data: {
            partner_id: partner,
            amount: requiredNumber(amount, "Importe"),
            paid_on,
            method,
            reference,
            reason,
          },
        }),
      );
      close();
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <h2>Registrar un pago realizado</h2>
      <form
        onSubmit={save}
        onChange={() => {
          request.current = null;
        }}
      >
        <div className={s.formGrid}>
          <label>
            Beneficiario *
            <select
              required
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
            >
              <option value="">Selecciona un contacto…</option>
              {data.partners
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.kind}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Importe USD *
            <input
              type="number"
              required
              min="0.01"
              max="1000000"
              step="0.01"
              placeholder="Ej. 250.00"
              value={amount}
              onChange={(e) => setAmount(numericDraft(e.target.value))}
            />
          </label>
          <label>
            Fecha del pago *
            <input
              type="date"
              required
              max={today()}
              value={paid_on}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Medio de pago
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>
          <label>
            Referencia / comprobante *
            <input
              required
              maxLength={80}
              placeholder="Número de recibo, cheque o transferencia"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label>
            Concepto / motivo *
            <input
              required
              maxLength={250}
              placeholder="Ej. Liquidación por entrega de café"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
        <Notice message={message} />
        <div className={s.actions}>
          <button
            type="button"
            disabled={busy}
            className={s.secondary}
            onClick={close}
          >
            Cancelar
          </button>
          <button disabled={busy}>
            {busy ? "Registrando…" : "Guardar registro de pago"}
          </button>
        </div>
      </form>
    </section>
  );
}
function PaymentCard({ payment }: { payment: Payment }) {
  const { data, execute, busy } = useStore();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  async function cancel(e: FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        "¿Anular este registro? Esto no devuelve dinero ni revierte transferencias bancarias.",
      )
    )
      return;
    try {
      await execute(
        commandSchema.parse({
          type: "cancel_payment",
          payment_id: payment.id,
          reason,
        }),
      );
      setOpen(false);
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <article className={s.card}>
      <div className={s.saleHeader}>
        <div>
          <h3>{payment.partner_name}</h3>
          <small>
            {payment.paid_on.split("-").reverse().join("/")} ·{" "}
            {payment.reference} · {payment.method}
          </small>
        </div>
        <Badge inactive={payment.status === "anulado"}>{payment.status}</Badge>
        <strong>{money(payment.amount)}</strong>
        <button
          className={s.inlineButton}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar" : "Ver detalle"}
        </button>
      </div>
      {open && (
        <div className={s.detail}>
          <p>Concepto: {payment.reason}</p>
          <p>
            Registró: {payment.actor} · {date(payment.created_at)}
          </p>
          <p>Identificador: {payment.id}</p>
          {payment.cancel_reason && (
            <p>
              Anulado por {payment.cancelled_by}: {payment.cancel_reason}
            </p>
          )}
          {payment.status === "vigente" &&
            data &&
            can(data.role, "cancel_payment") && (
              <form onSubmit={cancel} className={s.toolbar}>
                <label>
                  Motivo de anulación *
                  <input
                    required
                    maxLength={250}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy} className={s.danger}>
                  Anular registro
                </button>
              </form>
            )}
          <Notice message={message} />
        </div>
      )}
    </article>
  );
}
export function Payments() {
  const { data } = useStore();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("");
  if (!data) return null;
  const filtered = data.payments.filter(
    (p) =>
      (!status || p.status === status) &&
      `${p.partner_name} ${p.reference} ${p.reason}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  function exportCsv() {
    download(
      "agrocontrol-pagos.csv",
      csv([
        [
          "ID",
          "Beneficiario",
          "Importe USD",
          "Fecha del pago",
          "Medio",
          "Referencia",
          "Concepto",
          "Estado",
          "Responsable",
          "Motivo de anulación",
        ],
        ...filtered.map((p) => [
          p.id,
          p.partner_name,
          p.amount,
          p.paid_on,
          p.method,
          p.reference,
          p.reason,
          p.status,
          p.actor,
          p.cancel_reason || "",
        ]),
      ]),
    );
  }
  return (
    <>
      <Heading
        eyebrow="CONTROL DE EGRESOS DE LA FINCA"
        title="Pagos a contactos"
        description="Registra pagos realizados a productores, proveedores o clientes."
      >
        {can(data.role, "payment") && (
          <button onClick={() => setOpen((v) => !v)}>
            <Plus size={15} />
            Registrar pago
          </button>
        )}
      </Heading>
      <div className={s.notice}>
        Este módulo registra pagos ya realizados y sus comprobantes. No ejecuta
        transferencias, no genera saldos pendientes ni vincula automáticamente
        una recepción con un pago.
      </div>
      <section className={`${s.card} ${s.cardPad} ${s.paymentSummary}`}>
        <Wallet />
        <div>
          <p>Pagos vigentes del mes</p>
          <strong>{money(data.metrics.month_payments || 0)}</strong>
        </div>
        <span>
          {data.metrics.payment_count || 0} registros · historial completo
        </span>
      </section>
      {open && <PaymentForm close={() => setOpen(false)} />}
      <div className={s.toolbar}>
        <label>
          Buscar beneficiario o referencia
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, comprobante o concepto…"
          />
        </label>
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="anulado">Anulados</option>
          </select>
        </label>
        <button className={s.secondary} onClick={exportCsv}>
          <Download size={15} />
          Exportar CSV visible
        </button>
      </div>
      <p className={s.muted}>
        Historial visible: hasta 200 registros más recientes. La suma mensual
        consulta todo el historial.
      </p>
      {filtered.map((p) => (
        <PaymentCard key={p.id} payment={p} />
      ))}
      {!filtered.length && (
        <section className={s.card}>
          <Empty>No hay pagos con estos filtros.</Empty>
        </section>
      )}
    </>
  );
}
