import { Namespace, Context } from '@ory/keto-namespace-types'

class Identity implements Namespace {}

class Role implements Namespace {
  related: {
    members: Identity[]
  }
}

class Organization implements Namespace {
  related: {
    owners: Identity[]
    editors: Identity[]
    viewers: Identity[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewers.includes(ctx.subject) || this.permits.edit(ctx),
    edit: (ctx: Context): boolean =>
      this.related.editors.includes(ctx.subject) || this.permits.manage(ctx),
    manage: (ctx: Context): boolean => this.related.owners.includes(ctx.subject),
  }
}

class Project implements Namespace {
  related: {
    parents: Organization[]
  }

  permits = {
    view: (ctx: Context): boolean => this.related.parents.traverse((o) => o.permits.view(ctx)),
    edit: (ctx: Context): boolean => this.related.parents.traverse((o) => o.permits.edit(ctx)),
    delete: (ctx: Context): boolean => this.related.parents.traverse((o) => o.permits.manage(ctx)),
  }
}
