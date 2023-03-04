import { StreamResponse } from '@worker-tools/shed'
import ComponentRewriter from './rewriter/ComponentRewriter'

export async function route(request: Request): Promise<Response> {
  const rewriter = new HTMLRewriter()
  const url = new URL(request.url)

  const components: Component[] = []
  const chunks: Chunk[] = []

  const requestClone = request.clone()
  components.forEach((component) => {
    if (url.pathname.match(component.route.selector))
      rewriter.on(
        component.html.selector,
        new ComponentRewriter(requestClone, component, chunks),
      )
  })

  async function* streamResponseWithComponents() {
    const selfDeleteTag =
      'const _self = document.currentScript;_self.parentNode.removeChild(_self)'
    // awaited to prevent streaming of chunks prior to origin shell
    const response = await fetch(request)
    yield rewriter.transform(response).text()
    if (request.headers.has('cookie'))
      yield `<script>document.cookie = ${JSON.stringify(
        request.headers.get('cookie'),
      )};${selfDeleteTag}</script>`

    // let each promise resolve
    for (const chunk of chunks)
      chunk.value.then(
        (val) =>
          yield `<script>document.querySelector(${JSON.stringify(
            chunk.id,
          )}).innerHTML = ${JSON.stringify(val)};${selfDeleteTag}</script>`,
      )

    await Promise.all(chunks.map((chunk) => chunk.value))
    // anything else can be done now
  }

  return new StreamResponse(streamResponseWithComponents(), {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
