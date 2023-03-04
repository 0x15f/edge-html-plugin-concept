import ComponentRewiter from './ComponentRewriter'

export default class BlockingComponentRewriter extends ComponentRewiter {
  async element(element: Element): Promise<void> {
    super.element(element)

    const response = await (this.component._promise ??
      this.component.function(this.request))
    const payload = await response.text()
    const elementFunc = this.component.options.template
      ? element.replace
      : element.prepend
    elementFunc(payload, {
      html: true,
    })
    if (this.component.options.template) element.removeAndKeepContent()
  }
}
