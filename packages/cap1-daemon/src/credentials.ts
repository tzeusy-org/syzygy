// The local credential lifecycle is packages/http-host/src/credentials.ts,
// moved there byte for byte (syzygy-bpyt.7.3). This path stays because
// governed files cite it, and re-exports every name it had.
export {
  authorizeStateWrite,
  credentialFromAuthorizationHeader,
  CREDENTIAL_FILE_MODE,
  CREDENTIAL_FILE_NAME,
  CREDENTIAL_TOKEN_BYTES,
  ensureCredential,
  STATE_DIR_MODE,
  STATE_WRITE_REFUSALS,
  verifyCredential,
  type CredentialInspection,
  type CredentialProvision,
  type CredentialStat,
  type StateWriteAuthorization,
  type StateWriteRefusalName,
} from '@syzygy/http-host';
