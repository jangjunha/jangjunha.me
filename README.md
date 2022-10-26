# jangjunha.me

[https://jangjunha.me][jangjunha.me]

## Prerequisites

The site builds with [Zola][zola] and styles with [Tailwind CSS][tailwindcss].

- [Tailwind CLI][tailwindcss-installation]
- [Zola CLI][zola-installation]

## Development

```bash
$ tailwindcss --watch \
    -i static/assets/tailwind.src.css \
    -o static/assets/tailwind.dist.css
```

```bash
$ zola serve
```

## Production Build

```bash
$ tailwindcss --minify \
    -i static/assets/tailwind.src.css \
    -o static/assets/tailwind.dist.css

$ zola build

$ ll public/
```

[jangjunha.me]: https://jangjunha.me
[zola]: https://www.getzola.org
[zola-installation]: https://www.getzola.org/documentation/getting-started/installation/
[tailwindcss]: https://tailwindcss.com
[tailwindcss-installation]: https://tailwindcss.com/docs/installation
