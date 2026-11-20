# NexoraOS Amber System Redesign

## Objective
Unify the NexoraOS product interface around a single amber action accent, replace scattered literal colors with role-based tokens, repair light-mode theming, redesign the dashboard shell and Product Studio, normalize shared controls, and leave the existing routes and product behavior intact.

## Design direction
- **Movement:** utilitarian creator workstation with a warm instrument-panel signal.
- **Core principles:** one clear action signal; charcoal surfaces with measured depth; dense but calm workspace chrome; creation-first composition.
- **Color philosophy:** amber is reserved for action, selection, focus, and progress. Charcoal, graphite, and warm-neutral text carry the rest of the interface.
- **Layout paradigm:** a persistent workbench shell: navigation as a quiet rail, the composer as the main instrument, and supporting states arranged as a readable work surface rather than a card gallery.
- **Signature elements:** amber active rail; composer command strip; compact workbench section labels in sentence case.
- **Interaction philosophy:** actions should be legible without glow; selection is shown with amber edge + surface contrast; secondary controls recede until needed.
- **Animation:** short opacity/transform transitions only; reduced-motion fallback remains in place.
- **Typography:** retain Inter as approved; normalize weight and size usage.
- **Brand essence:** NexoraOS is a creator workstation for turning a brief into a finished product with coordinated AI tools. Personality: focused, capable, warm.
- **Brand voice:** direct and task-oriented. Example: “Describe the product you want to make.” / “Choose a format to begin.”
- **Signature brand color:** amber `#E2A93B` with accessible dark ink `#17130A`.

## Implementation
- Add role-based theme tokens in `src/index.css` and Tailwind mappings in `tailwind.config.ts`.
- Replace blue/violet action states in shared and dashboard components with amber tokens.
- Remove broad light-mode inversion selectors and use theme-scoped variables instead.
- Redesign `DashboardSidebar` hierarchy and `ProductGeneratorChat` composer/chrome while preserving routes, handlers, labels, and data flow.
- Normalize the shared `Button` primitive and app-level control states.
- Run ESLint autofix and resolve remaining reported errors without changing runtime behavior.
- Keep Inter, defer broad responsive refinement and full accessibility audit.

## Project structure
- `src/index.css`: tokens, global surfaces, interaction foundations.
- `tailwind.config.ts`: semantic color and radius aliases.
- `src/components/ui/button.tsx`: shared action primitive.
- `src/components/dashboard/DashboardSidebar.tsx`: shell navigation and account controls.
- `src/components/dashboard/ProductGeneratorChat.tsx`: Product Studio workbench.
- `src/components/dashboard/*.tsx`: supporting dashboard surfaces consuming the shared tokens.
- `public/manus-routes.json`: complete declared route set.
