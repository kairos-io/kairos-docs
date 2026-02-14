## Migration Acceptance criteria

### URLs & routing
- [ ] Existing URLs must remain unchanged
- [ ] If redirects are required:
  - [ ] they must be **server-side** (Netlify)
  - [ ] not frontend-based redirects

### Content
- [ ] All documentation pages are migrated
- [ ] All blog posts are migrated and visible
- [ ] No missing sections or orphaned pages

### Styling & layout
- [ ] Styling is consistent across:
  - list pages vs single pages
  - different page layouts
- [ ] Mobile rendering works correctly
- [ ] No major regressions in light or dark mode

### Kairos-specific functionality
- [ ] Flavor selector still works
  - [ ] changing flavor updates examples
  - [ ] flavor-specific messages render correctly
- [ ] Blog list configuration behaves as expected

### Technical
- [ ] Analytics are correctly configured and working
- [ ] Generated directories are not committed:
  - [ ] `.docusaurus/`
  - [ ] `build/`
