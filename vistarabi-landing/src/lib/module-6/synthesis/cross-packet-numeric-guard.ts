import {
  extractEvidenceNumbers,
  validateNumericClaims,
  type NumericGuardResult,
  type EvidenceInput,
} from '../shared/numeric-guard';
import type { EventEvidencePacket, CorrelationEvidencePacket } from './types';

export type CrossPacketNumericGuardResult = NumericGuardResult;

export function extractAllEvidenceNumbers(
  events: EventEvidencePacket[],
  correlations: CorrelationEvidencePacket[]
): number[] {
  return extractEvidenceNumbers([
    ...(events as EvidenceInput[]),
    ...(correlations as EvidenceInput[]),
  ]);
}

export function validateCrossPacketNumerics(
  modelOutput: string,
  events: EventEvidencePacket[],
  correlations: CorrelationEvidencePacket[]
): CrossPacketNumericGuardResult {
  return validateNumericClaims(
    modelOutput,
    [...events, ...correlations] as EvidenceInput[],
    'This synthesized insight could not be validated against the available statistical evidence and was suppressed.'
  );
}