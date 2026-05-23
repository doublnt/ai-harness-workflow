# Contributing

Thank you for contributing.

## Local checks

~~~bash
npm test
npm run lint
~~~

## Design expectations

This project is intentionally small and dependency-free. Before adding a dependency, explain:

- why built-in Node APIs are insufficient
- supply-chain impact
- maintenance impact
- how the dependency will be tested

## Pull request checklist

- [ ] Scanner behavior tested when changed
- [ ] Generator behavior tested when changed
- [ ] No target output writes `.ai/`
- [ ] Existing files are not overwritten without draft behavior
- [ ] README/docs updated if behavior changed
