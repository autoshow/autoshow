# Build Report

Analyze SolidStart build for optimization opportunities.

## Outline

- [Usage](#usage)
- [What It Analyzes](#what-it-analyzes)
- [Output](#output)
- [Optimization Strategies](#optimization-strategies)
  - [Large Dependencies](#large-dependencies)
  - [Code Splitting](#code-splitting)
  - [Example: Lazy Loading](#example-lazy-loading)
- [Performance Targets](#performance-targets)
- [Related Files](#related-files)

## Usage

```bash
bun as build-report
```

## What It Analyzes

1. **Bundle Size**: Total size of JavaScript bundles
2. **Chunk Breakdown**: Individual chunk sizes and contents
3. **Dependencies**: Largest dependencies by size
4. **Code Splitting**: How code is split across chunks
5. **Optimization Opportunities**: Suggestions for reducing bundle size

## Output

The report includes:

- Total bundle size (gzipped and uncompressed)
- List of all chunks with sizes
- Dependency tree with package sizes
- Recommendations for optimization

## Optimization Strategies

### Large Dependencies

If a large dependency is identified:
- Check if it's tree-shakeable
- Consider lighter alternatives
- Use dynamic imports for non-critical code

### Code Splitting

Improve code splitting by:
- Using route-based splitting (built-in with SolidStart)
- Lazy loading components with `lazy()`
- Dynamic imports for heavy libraries

### Example: Lazy Loading

```typescript
import { lazy } from "solid-js"

const HeavyComponent = lazy(() => import("~/components/HeavyComponent"))

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## Performance Targets

- **Initial bundle**: < 100 KB (gzipped)
- **Total JavaScript**: < 500 KB (gzipped)
- **Lighthouse Performance**: > 90

## Related Files

- `vite.config.ts` - Build configuration
- `.github/build-report.sh` - Report generation script
