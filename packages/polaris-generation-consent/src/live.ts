/**
 * Everything in this package outside the parked consent ports: what a module the `syzygy` CLI reaches may import
 * (`@syzygy/polaris-generation-consent/live`). `consent-ports.ts` is parked egress code that takes pipeline types and
 * `digestCanonicalJson` from the core root, which re-exports the parked provider island, so it is exported from this
 * package's root only, beside everything here; `island-boundary.test.ts` fails when a module the CLI reaches imports it.
 */
export { AdmissionRecordError, COMMIT_OBJECT_ID, parseAdmissionRecords, type AdmissionClass, type AdmissionRecord, type AdmissionRecordReader } from './admission-record.js';
export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';
export { ADMISSION_ACT_FORMS, DECISIONS_DIR, EGRESS_V2_INSTANCE, INSTANCES_DIR, POLICY_ACT_FORMS, POLICY_PATH, createAdmissionRecordsPort, createPackageAdmissionReader, createPackageAdmissionRecordsPort, createPackagePolicyReader, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM_V1_0, readClassActState, readDigestBoundActState, readInForceEgress, readPolicyActChain, readVersionedSignoffState, REGISTRY_GIT_SOURCE_ACT_FORM, type ActState, type DigestBoundAct, type ExemptRecord, type DigestBoundActForm, type VersionedSignoffForm, type ClassActRead, type InForceEgress, type ParsedAct, type PolicyActChain, type StrictReadOptions, type AdmissionActForm, type AdmissionAnswerLike, type AdmissionRecordsPortLike, type AdmissionRequirementLike, type ConsentedRevision, type PackageReaderFs, type PolicyActReader, type PolicyActRecord } from './package-reader.js';
export { SLOT, recorderTemplate, templateFields, type RecorderTemplate } from './recorder-template.js';
