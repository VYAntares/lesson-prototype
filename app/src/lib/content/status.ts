import { isPlayableKind, needsContentFile } from '../../schemas/brief'
import type { LessonArtifacts } from '../../schemas/manifest'

export const ARTIFACT_PROBLEMS = ['malformed', 'invalid', 'stale'] as const
export type ArtifactProblem = (typeof ARTIFACT_PROBLEMS)[number]

/** Summary shown in the "Content" column of the lesson table. */
export function describeArtifacts(artifacts: LessonArtifacts | undefined) {
  const draft = artifacts?.draft
  const content = artifacts?.content
  return {
    label: content ? 'content' : draft ? 'draft' : 'outline',
    incomplete: Boolean(content && !draft),
    problem: ARTIFACT_PROBLEMS.find((p) => draft?.status === p || content?.status === p) ?? null,
  } as const
}

export type StartBlocker = 'missingDraft' | 'missingContent' | ArtifactProblem | 'unsupported'

/** Reasons why a lesson cannot be started; empty when it can. */
export function startBlockers(kind: string, artifacts: LessonArtifacts | undefined): StartBlocker[] {
  const reasons: StartBlocker[] = []
  if (!artifacts?.draft) reasons.push('missingDraft')
  if (needsContentFile(kind) && !artifacts?.content) reasons.push('missingContent')
  for (const p of ARTIFACT_PROBLEMS)
    if (artifacts?.draft?.status === p || artifacts?.content?.status === p) reasons.push(p)
  if (!isPlayableKind(kind)) reasons.push('unsupported')
  return reasons
}
