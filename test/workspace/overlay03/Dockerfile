FROM rocker/r-ver:3.3.3
MAINTAINER o2r

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
    ## Packages required by R extension packages
    # required by rmarkdown:
    lmodern \
    pandoc \
    # for devtools (requires git2r, httr):
    libcurl4-openssl-dev \
    libssl-dev \
    git \
    # for udunits:
    libudunits2-0 \
    libudunits2-dev \
    # required when knitting the document
    pandoc-citeproc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# install R extension packages
RUN install2.r -r "http://cran.rstudio.com" \
      rmarkdown \
      ggplot2 \
      devtools \
      && rm -rf /tmp/downloaded_packages/ /tmp/*.rd

# Save installed packages to file
RUN dpkg -l > /dpkg-list.txt

LABEL Description="This is an ERC image." \
    info.o2r.bag.id="123456"

#VOLUME ["/erc"]

ENTRYPOINT ["sh", "-c"]
CMD ["R --vanilla -e \"rmarkdown::render(input = '/erc/main.Rmd', output_dir = '/erc', output_format = rmarkdown::html_document())\""]

# docker build -t overlay01image .
# docker run -it --rm -v $(pwd):/erc overlay01image
